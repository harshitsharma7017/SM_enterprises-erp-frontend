'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('auth_token')) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');

    if (!email || !password) {
      return setError('Please fill in both fields.');
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span
            className="grid place-items-center rounded-xl"
            style={{
              width: 48, height: 48,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              color: '#fff', fontWeight: 700, fontSize: '1.1rem',
            }}
          >
            GT
          </span>
          <div>
            <h2 className="text-2xl font-bold text-fg tracking-tight" style={{ margin: 0 }}>
              Guru Traders
            </h2>
            <p className="text-xs text-fg-subtle uppercase tracking-wider font-medium" style={{ margin: 0 }}>
              Export ERP
            </p>
          </div>
        </div>
        <p className="text-center text-sm text-fg-subtle">
          Sign in to your workspace
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-line">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-[var(--danger)] rounded-md text-sm flex items-center">
              <i className="bi bi-exclamation-octagon mr-2 flex-shrink-0"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-fg-muted">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input placeholder-gray-400 focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-fg-muted">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input placeholder-gray-400 focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)] pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-fg-subtle hover:text-link"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-fill' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)] transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
