import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'forgot';

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // If already logged in, redirect to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setSubmitting(false);
    }
    // On success, onAuthStateChange will trigger redirect via the user check above
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setResetSent(true);
  };

  function switchToForgot() {
    setMode('forgot');
    setError('');
    setResetSent(false);
  }

  function switchToSignIn() {
    setMode('signin');
    setError('');
    setResetSent(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-4">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-primary-400/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-primary-300/5 blur-2xl" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white shadow-2xl">
          {/* Header */}
          <div className="rounded-t-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
              <svg
                viewBox="0 0 24 24"
                className="h-9 w-9 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2C8.5 2 6 4.5 6 7c0 1.5.5 3 1.5 4L12 22l4.5-11c1-1 1.5-2.5 1.5-4 0-2.5-2.5-5-6-5z" />
                <circle cx="12" cy="7.5" r="2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Ava Smart Dental</h1>
            <p className="mt-1 text-sm text-primary-100">Clinic Management for Filipino Dentists</p>
          </div>

          {/* Form */}
          {mode === 'signin' ? (
            <form onSubmit={handleSubmit} className="space-y-5 px-8 py-8">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                autoComplete="current-password"
                required
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={switchToForgot}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                size="lg"
                loading={submitting}
                leftIcon={<LogIn className="h-5 w-5" />}
                className="w-full"
              >
                Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5 px-8 py-8">
              {resetSent ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-center">
                    <p className="text-sm font-medium text-green-700">
                      Reset link sent
                    </p>
                    <p className="mt-1 text-xs text-green-600">
                      Check {email} for a link to reset your password. It may
                      take a minute to arrive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={switchToSignIn}
                    className="flex items-center justify-center gap-2 w-full text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Reset your password
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter your email and we'll send you a link to set a new
                      password.
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="h-4 w-4" />}
                    autoComplete="email"
                    required
                  />

                  <Button
                    type="submit"
                    size="lg"
                    loading={submitting}
                    className="w-full"
                  >
                    Send reset link
                  </Button>

                  <button
                    type="button"
                    onClick={switchToSignIn}
                    className="flex items-center justify-center gap-2 w-full text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </button>
                </>
              )}
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-primary-200">
          Ava Smart Dental &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
