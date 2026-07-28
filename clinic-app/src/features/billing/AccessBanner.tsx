import { Link } from 'react-router-dom';
import type { AccessTier } from '@/lib/access';

/**
 * App-wide subscription-lapse banner — mounted once in the authenticated
 * Layout shell so it's visible on every page, not just Settings. Grace is
 * amber and reassuring (records are safe, still have access); read-only
 * is red and states plainly that records remain viewable/exportable, only
 * new writes are paused (matches the RLS write-gate, which never deletes
 * or hides data).
 */
export function AccessBanner({ tier, daysLeft }: { tier: AccessTier; daysLeft: number }) {
  if (tier === 'full') return null;
  const readOnly = tier === 'read_only';
  return (
    <div
      className={`px-4 py-2.5 text-center text-sm sm:text-left ${
        readOnly ? 'bg-danger-50 text-danger-600' : 'bg-warning-50 text-warning-600'
      }`}
    >
      {readOnly ? (
        <>
          Your subscription has lapsed. Your patient records are safe and you can still view and
          export everything — new entries are paused until payment.{' '}
        </>
      ) : (
        <>
          Your subscription ended {daysLeft === 0 ? 'today' : `${Math.abs(daysLeft)} day(s) ago`}.
          You still have full access for now.{' '}
        </>
      )}
      <Link to="/settings?tab=billing" className="font-semibold underline">
        Pay now
      </Link>
    </div>
  );
}
