import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  PhilippinePeso,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

// ─── Navigation Items ─────────────────────────────────────────────
const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/expenses', label: 'Expenses', icon: PhilippinePeso },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

// ─── Tooth Icon (SVG) ─────────────────────────────────────────────
function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2c-2.5 0-4.5 1-5.5 2.5S5 7.5 5 9c0 2 .5 3.5 1 5 .3 1 .5 2 .5 3 0 1.5.5 3 1.5 4 .5.5 1.2.8 2 1 .3 0 .5-.2.7-.5l1.3-2.5c.3-.5.6-.5 1 0l1.3 2.5c.2.3.4.5.7.5.8-.2 1.5-.5 2-1 1-1 1.5-2.5 1.5-4 0-1 .2-2 .5-3 .5-1.5 1-3 1-5 0-1.5-.5-3.5-1.5-4.5S14.5 2 12 2z"/>
    </svg>
  );
}

// ─── Desktop Sidebar Component ────────────────────────────────────
export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'hidden lg:flex h-screen bg-sidebar flex-col shrink-0 transition-all duration-300 ease-in-out no-print',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo Area */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-white/10 shrink-0',
          collapsed ? 'justify-center px-2' : 'px-5 gap-3',
        )}
      >
        <ToothIcon className="h-7 w-7 text-primary-200 shrink-0" />
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight whitespace-nowrap">
            Ava Smart Dental
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg transition-colors duration-150 group relative',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-sidebar-active text-white'
                  : 'text-primary-200 hover:bg-sidebar-hover hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active accent border */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-300" />
                )}
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                {/* Tooltip on collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse */}
      <div className="border-t border-white/10 p-2 shrink-0 space-y-1">
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-primary-200 hover:bg-sidebar-hover hover:text-white transition-colors duration-150',
            collapsed && 'justify-center px-2',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

// ─── Mobile Sidebar (Drawer) ──────────────────────────────────────
export function MobileSidebar() {
  const mobileMenuOpen = useAppStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useAppStore((s) => s.setMobileMenuOpen);

  return (
    <>
      {/* Backdrop */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar flex flex-col transform transition-transform duration-300 ease-in-out no-print',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 border-b border-white/10 px-4">
          <div className="flex items-center gap-3">
            <ToothIcon className="h-7 w-7 text-primary-200 shrink-0" />
            <span className="text-white font-bold text-lg tracking-tight">
              Ava Smart Dental
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg text-primary-200 hover:bg-sidebar-hover hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-150 relative',
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-primary-200 hover:bg-sidebar-hover hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary-300" />
                  )}
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="text-base font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="border-t border-white/10 p-3 space-y-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <p className="text-xs text-primary-300 text-center">
            Ava Smart Dental · v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
