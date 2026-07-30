import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, User, Menu, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { fetchNotifications } from '@/lib/api';
import type { NotificationItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ClinicSwitcher } from '@/features/clinics/ClinicSwitcher';

// ─── Page title map ───────────────────────────────────────────────
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/billing': 'Billing',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/patients/')) return 'Patient Profile';
  return 'Dashboard';
}

// ─── TopBar Component ─────────────────────────────────────────────
export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const currentUser = useAppStore((s) => s.currentUser);
  const toggleMobileMenu = useAppStore((s) => s.toggleMobileMenu);

  // Real name comes from what signup collected (contact_name), falling back to
  // the clinic name, then the email. currentUser (store) is only an optional
  // override; it's null by default so no placeholder name can appear.
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (k: string) =>
    typeof meta[k] === 'string' && (meta[k] as string).trim() ? (meta[k] as string).trim() : '';
  const metaName = pick('contact_name') || pick('full_name') || pick('name') || pick('clinic_name');
  const nameSource = currentUser?.name ?? (metaName || '');
  const displayName = nameSource || user?.email || 'User';
  const initials = nameSource
    ? nameSource
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  async function handleSignOut() {
    setUserMenuOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    let cancelled = false;
    fetchNotifications()
      .then((rows) => {
        if (!cancelled) setNotifications(rows);
      })
      .catch(() => { /* silent — keep empty list */ });
    return () => { cancelled = true; };
  }, []);

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(location.pathname);

  // Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setSearchOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6 bg-white border-b border-gray-200 shadow-sm shrink-0 no-print"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Left: Hamburger + Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger */}
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Search Button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg sm:border sm:border-gray-200 sm:bg-gray-50 hover:bg-gray-100 text-gray-500 text-sm transition-colors duration-150 active:scale-95"
        >
          <Search className="h-4 w-4 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded">
            Ctrl+K
          </kbd>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors duration-150 active:scale-95"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center text-[10px] font-bold text-white bg-danger-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 max-h-[70vh] overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-gray-100 shrink-0">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No notifications
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0',
                        !n.read && 'bg-primary-50/50',
                      )}
                    >
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1" />

        {/* Clinic Switcher */}
        <ClinicSwitcher />

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 sm:px-2 sm:py-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150 active:scale-95"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <span className="hidden lg:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 hidden lg:block" />
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                {user?.email && displayName !== user.email && (
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/settings');
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
