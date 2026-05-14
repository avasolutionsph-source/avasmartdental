import { Outlet } from 'react-router-dom';
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { ToastContainer } from '@/components/ui/ToastContainer';

export function Layout() {
  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
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
