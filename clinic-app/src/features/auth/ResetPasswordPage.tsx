import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, AlertCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Status = 'awaiting-session' | 'ready' | 'saving' | 'saved' | 'invalid';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('awaiting-session');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  // Supabase puts the recovery tokens in the URL hash. The supabase-js
  // client picks them up on init via detectSessionInUrl (default true),
  // exchanges them for a session, then fires PASSWORD_RECOVERY on
  // onAuthStateChange. We wait for that event before letting the user
  // submit, so an opened-without-link visit can't change someone's
  // password.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setStatus('ready');
        }
      },
    );

    const t = window.setTimeout(() => {
      setStatus((prev) => (prev === 'awaiting-session' ? 'invalid' : prev));
    }, 3000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('saving');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setStatus('ready');
      setError(err.message);
      return;
    }
    setStatus('saved');
    window.setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-primary-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white shadow-2xl">
          <div className="rounded-t-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
              <Lock className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Set a new password</h1>
            <p className="mt-1 text-sm text-primary-100">
              Pick something at least 8 characters
            </p>
          </div>

          <div className="px-8 py-8">
            {status === 'awaiting-session' && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
                <p className="text-sm text-gray-500">Verifying your reset link…</p>
              </div>
            )}

            {status === 'invalid' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      Invalid or expired reset link
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      Reset links expire after a few minutes. Request a new one
                      from the sign-in page.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Back to sign in
                </Button>
              </div>
            )}

            {status === 'saved' && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-base font-semibold text-gray-900">
                  Password updated
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to your dashboard…
                </p>
              </div>
            )}

            {(status === 'ready' || status === 'saving') && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Input
                  label="New password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  autoComplete="new-password"
                  required
                />

                <Input
                  label="Confirm new password"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  autoComplete="new-password"
                  required
                />

                <Button
                  type="submit"
                  size="lg"
                  loading={status === 'saving'}
                  className="w-full"
                >
                  Update password
                </Button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-primary-200">
          Ava Smart Dental &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
