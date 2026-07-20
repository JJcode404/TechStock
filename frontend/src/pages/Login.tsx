import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { apiErrorMessage } from '../lib/api';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const [identifier, setIdentifier] = useState('admin@techstock.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed. Check your credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
            <ScanLine size={24} />
          </div>
          <div className="text-center">
            <h1 className="font-heading text-xl font-bold text-content">TechStock POS</h1>
            <p className="text-sm text-content-muted">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-content-secondary">
              Email or username
            </label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm text-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-content-secondary">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm text-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
