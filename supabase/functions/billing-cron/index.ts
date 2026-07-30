import { json } from '../_shared/http.ts';
import { serviceClient } from '../_shared/db.ts';

const DAY = 86_400_000;

/**
 * Brevo (transactional email API). Kept behind this one function so swapping
 * providers is a single edit. Never throws — a failed reminder must not abort
 * the cron run or block the lapse transitions below. With no BREVO_API_KEY set
 * it logs only, which is the email-deferred state; the paywall never depends on
 * email.
 *
 * Sender uses the already DNS-authenticated avasolutions.ph domain in Brevo
 * (from the AvaSpaCentral OTP work), so no new domain/DNS setup is required.
 * Override the address/name with BILLING_EMAIL_FROM / BILLING_EMAIL_FROM_NAME.
 */
async function sendBillingEmail(to: string, kind: string, ctx: Record<string, unknown>) {
  const key = Deno.env.get('BREVO_API_KEY');
  if (!key) { console.log('BILLING_EMAIL (no key, logged only)', { to, kind, ctx }); return; }

  const daysLeft = Number(ctx.daysLeft ?? 0);
  const trial = kind.startsWith('trial');
  const subject = trial
    ? `Your Ava Smart Dental trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
    : `Your Ava Smart Dental subscription renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;

  const senderEmail = Deno.env.get('BILLING_EMAIL_FROM') ?? 'no-reply@avasolutions.ph';
  const senderName = Deno.env.get('BILLING_EMAIL_FROM_NAME') ?? 'Ava Smart Dental';

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': key,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: `<p>Hi ${ctx.clinic ?? 'there'},</p>
               <p>${trial ? 'Your free trial' : 'Your subscription'} ends in
               <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>.
               Open Settings → Billing to show your GCash/Maya QR code and pay.</p>
               <p><a href="https://smartdentalapp.avasolutions.ph/settings?tab=billing">Pay now</a></p>
               <p>Your patient records are always safe — nothing is ever deleted.</p>`,
      }),
    });
    if (!res.ok) console.error('brevo failed', res.status, await res.text());
  } catch (e) {
    console.error('brevo threw', e);
  }
}

Deno.serve(async (req) => {
  // Not JWT-guarded (cron has no user), so it carries its own shared secret.
  if (req.headers.get('x-cron-secret') !== Deno.env.get('BILLING_CRON_SECRET')) {
    return json(401, { error: 'unauthorized' }, null);
  }

  const db = serviceClient();
  const now = Date.now();

  // Billing is account-level (Phase B). Iterate accounts, not clinics.
  const { data: accounts } = await db
    .from('accounts')
    .select('id, paid_until, grace_days, subscription_status, owner_user_id')
    .neq('subscription_status', 'canceled');

  let reminders = 0, lapsed = 0;

  for (const a of accounts ?? []) {
    const paidUntil = Date.parse(a.paid_until);
    const daysLeft = Math.ceil((paidUntil - now) / DAY);
    const onTrial = a.subscription_status === 'trialing';

    const kind =
      daysLeft === 7 ? (onTrial ? 'trial_t7' : 'renewal_t7') :
      daysLeft === 3 ? (onTrial ? 'trial_t3' : 'renewal_t3') :
      daysLeft === 1 ? (onTrial ? 'trial_t1' : 'renewal_t1') : null;

    if (kind) {
      // Insert first; a duplicate key means it already went out.
      const { error } = await db.from('billing_reminders')
        .insert({ account_id: a.id, kind, period_start: a.paid_until });
      if (!error) {
        const { data: u } = await db.auth.admin.getUserById(a.owner_user_id);
        if (u?.user?.email) {
          await sendBillingEmail(u.user.email, kind, { daysLeft });
        }
        reminders++;
      }
    }

    // Past paid_until + grace -> past_due. This only flips a label; the actual
    // write-blocking is done by RLS off the dates, so it cannot drift.
    const graceEnds = paidUntil + a.grace_days * DAY;
    if (now > graceEnds && a.subscription_status !== 'past_due') {
      await db.from('accounts').update({ subscription_status: 'past_due' }).eq('id', a.id);
      lapsed++;
    }
  }

  return json(200, { reminders, lapsed }, null);
});
