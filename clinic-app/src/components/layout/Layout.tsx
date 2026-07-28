import { Outlet } from 'react-router-dom';
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { AccessBanner } from '@/features/billing/AccessBanner';
import { accessTier } from '@/lib/access';
import { useClinicBilling } from '@/features/billing/useClinicBilling';

const GRACE_DAYS = 7;

export function Layout() {
  const { data: billing } = useClinicBilling();
  const tier = accessTier(billing?.paid_until, GRACE_DAYS, billing?.subscription_status);
  const daysLeft = billing?.paid_until
    ? Math.floor((Date.parse(billing.paid_until) - Date.now()) / 86_400_000)
    : 0;

  return (
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
  );
}
