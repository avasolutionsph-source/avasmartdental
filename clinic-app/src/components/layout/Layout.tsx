import { Outlet } from 'react-router-dom';
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { AccessBanner } from '@/features/billing/AccessBanner';
import { ReadOnlyGate } from '@/features/billing/ReadOnlyGate';
import { accessTier } from '@/lib/access';
import { useClinicBilling } from '@/features/billing/useClinicBilling';
import { useClinicBootstrap } from '@/features/clinics/useClinics';

const GRACE_DAYS = 7;

// Full-screen spinner shown while the clinic list loads and an active
// clinic is confirmed — mirrors the AuthGateSplash style in app/router.tsx.
// Rendering the shell (TopBar's notification fetch, Outlet's data pages)
// before this resolves would fire tenant-scoped queries with no/stale
// x-clinic-id header, which silently come back empty rather than erroring.
function ClinicGateSplash() {
  return (
    <div className="flex min-h-screen h-[100dvh] items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
    </div>
  );
}

export function Layout() {
  const { ready } = useClinicBootstrap();
  const { data: billing } = useClinicBilling();
  const tier = accessTier(billing?.paid_until, GRACE_DAYS, billing?.subscription_status);
  const daysLeft = billing?.paid_until
    ? Math.floor((Date.parse(billing.paid_until) - Date.now()) / 86_400_000)
    : 0;

  if (!ready) return <ClinicGateSplash />;

  return (
    <ReadOnlyGate>
      <div className="flex h-screen h-[100dvh] overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar />
          <AccessBanner tier={tier} daysLeft={daysLeft} />
          <main
            className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <Outlet />
          </main>
        </div>

        <GlobalSearch />
        <ToastContainer />
      </div>
    </ReadOnlyGate>
  );
}
