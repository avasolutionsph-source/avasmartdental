import { create } from 'zustand';

type AppState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  currentUser: { name: string; role: string; avatar: string | null } | null;
  setCurrentUser: (user: AppState['currentUser']) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () =>
    set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

  currentUser: { name: 'Dr. Maria Santos', role: 'admin', avatar: null },
  setCurrentUser: (user) => set({ currentUser: user }),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
}));
