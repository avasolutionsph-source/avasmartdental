// Ported from nextpay-kit/reference/nextpayClient.ts for Deno.
// Changes from the kit original, and ONLY these:
//   1. Buffer.from(...).toString('base64') -> btoa(...)   (no node:buffer)
//   2. added cancelPaymentIntent() for the go-live wiring check
//
// Auth: HTTP Basic — Authorization: Basic base64(client_id:client_secret).
// Host is the same for sandbox and production; only the key prefix differs
// (pk_test_ / pk_live_). Amounts are integer centavos with currency "PHP/2".
// NOTE: the dashboard self-serve key (ck_…) does NOT work here — it 401s.

const DEFAULT_BASE_URL = 'https://api.partners.nextpay.world';

export interface CreatePaymentIntentArgs {
  accountId: string;
  externalId: string;
  amountCentavos: number;
  expiresInSeconds?: number;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  id: string;
  status: string; // pending | succeeded | failed | canceled | expired
  amountCentavos: number;
  expiresAt: string | null;
  instrumentId: string | null;
  qrString: string | null;
  qrImageDataUrl: string | null;
}

export class NextPayError extends Error {
  constructor(message: string, public statusCode: number, public body?: unknown) {
    super(message);
    this.name = 'NextPayError';
  }
}

export class NextPayClient {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(clientId: string, clientSecret: string, baseUrl: string = DEFAULT_BASE_URL) {
    if (!clientId || !clientSecret) {
      throw new Error('NextPayClient: clientId and clientSecret are required');
    }
    this.authHeader = 'Basic ' + btoa(`${clientId}:${clientSecret}`);
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  async createPaymentIntent(args: CreatePaymentIntentArgs): Promise<PaymentIntentResult> {
    const body = {
      account_id: args.accountId,
      external_id: args.externalId,
      amount: args.amountCentavos,
      currency: 'PHP/2',
      expires_in_seconds: args.expiresInSeconds ?? 900,
      payment_instrument_options: { method_type: 'qrph_p2m_reference', method_provider: 'automatic' },
      ...(args.metadata ? { metadata: args.metadata } : {}),
    };
    const data = await this.request('POST', '/v2/payment-intents', {
      body,
      idempotencyKey: `pi-${args.externalId}`,
    });
    return normalizeIntent(data);
  }

  async getPaymentIntent(id: string): Promise<PaymentIntentResult> {
    const data = await this.request(
      'GET',
      `/v2/payment-intents/${encodeURIComponent(id)}?include_payment_instrument=true`,
    );
    return normalizeIntent(data);
  }

  async cancelPaymentIntent(id: string): Promise<PaymentIntentResult> {
    const data = await this.request(
      'PATCH',
      `/v2/payment-intents/${encodeURIComponent(id)}/cancel`,
    );
    return normalizeIntent(data);
  }

  private async request(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    opts: { body?: unknown; idempotencyKey?: string } = {},
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.idempotencyKey) headers['X-Idempotency-Key'] = opts.idempotencyKey;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
    if (!res.ok) {
      const rec = (data && typeof data === 'object') ? (data as Record<string, unknown>) : {};
      const detail = rec.detail ?? rec.code ?? text;
      throw new NextPayError(`NextPay ${res.status}: ${detail}`, res.status, data);
    }
    return (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  }
}

function normalizeIntent(data: Record<string, unknown>): PaymentIntentResult {
  const instrument = (data.payment_instrument as Record<string, unknown> | undefined) ?? null;
  const actions = (instrument?.actions as Array<Record<string, unknown>> | undefined) ?? [];
  const qrAction = actions.find((a) => a.action_kind === 'qr.present');
  const ci = (qrAction?.client_instructions as Record<string, unknown> | undefined) ?? {};
  const base64 = ci.qrph_base64_string as string | undefined;
  return {
    id: String(data.id ?? ''),
    status: String(data.status ?? 'pending'),
    amountCentavos: Number(data.amount ?? 0),
    expiresAt: (data.expires_at as string | null) ?? null,
    instrumentId: instrument ? String(instrument.id ?? '') : null,
    qrString: (ci.qrph_string as string | undefined) ?? null,
    qrImageDataUrl: base64 ? `data:image/png;base64,${base64}` : null,
  };
}
