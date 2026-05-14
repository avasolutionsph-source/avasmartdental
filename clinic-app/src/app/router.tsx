import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/lib/auth';
import LoginPage from '@/features/auth/LoginPage';
import ResetPasswordPage from '@/features/auth/ResetPasswordPage';

// ─── Loading Fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// Full-screen splash while we resolve the initial Supabase session.
function AuthGateSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
    </div>
  );
}

// Sends unauthenticated users to /login; everyone else gets the requested page.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthGateSplash />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─── Lazy-loaded Pages ────────────────────────────────────────────
const DashboardPage = React.lazy(() => import('@/features/dashboard/DashboardPage'));
const PatientsPage = React.lazy(() => import('@/features/patients/PatientsPage'));
const PatientProfilePage = React.lazy(() => import('@/features/patients/PatientProfilePage'));
const AppointmentsPage = React.lazy(() => import('@/features/appointments/AppointmentsPage'));
const ReportsPage = React.lazy(() => import('@/features/reports/ReportsPage'));
const ExpensesPage = React.lazy(() => import('@/features/expenses/ExpensesPage'));
const SettingsPage = React.lazy(() => import('@/features/settings/SettingsPage'));

// ─── Suspense Wrapper ─────────────────────────────────────────────
function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ─── Router ───────────────────────────────────────────────────────
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Lazy>
            <DashboardPage />
          </Lazy>
        ),
      },
      {
        path: 'patients',
        element: (
          <Lazy>
            <PatientsPage />
          </Lazy>
        ),
      },
      {
        path: 'patients/:id',
        element: (
          <Lazy>
            <PatientProfilePage />
          </Lazy>
        ),
      },
      {
        path: 'appointments',
        element: (
          <Lazy>
            <AppointmentsPage />
          </Lazy>
        ),
      },
      {
        path: 'billing',
        element: <Navigate to="/reports" replace />,
      },
      {
        path: 'reports',
        element: (
          <Lazy>
            <ReportsPage />
          </Lazy>
        ),
      },
      {
        path: 'expenses',
        element: (
          <Lazy>
            <ExpensesPage />
          </Lazy>
        ),
      },
      {
        path: 'settings',
        element: (
          <Lazy>
            <SettingsPage />
          </Lazy>
        ),
      },
    ],
  },
  {
    // Anything else bounces to the dashboard (which itself enforces auth).
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
