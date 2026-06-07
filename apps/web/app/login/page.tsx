'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Mail,
  ShoppingCart,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../lib/api';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    fullName?: string | null;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,184,166,0.22),transparent_28%),radial-gradient(circle_at_78%_68%,rgba(245,158,11,0.16),transparent_28%)]" />
          <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
            <div>
              <a href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-slate-200">
                <ShoppingCart size={15} />
                WooCommerce recovery console
              </a>
              <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-tight tracking-normal">
                Recover more carts with a cleaner operating workflow.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Track abandoned orders, tune recovery timing, and manage store connections from one focused dashboard.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                'Order detection and recovery queue',
                'Email and WhatsApp campaign controls',
                'Store credentials and webhook health checks',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3"
                >
                  <CheckCircle2 size={18} className="text-teal-300" />
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white lg:hidden">
                <ShoppingCart size={22} />
              </div>
              <p className="mt-6 text-sm font-medium uppercase text-slate-500">
                Abandonment Buddy
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                Sign in to your workspace
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use your account to manage stores, orders, and recovery campaigns.
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Email address
                  </span>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Password</span>
                    <a href="/forgot-password" className="text-xs text-slate-500 hover:text-slate-800">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <LockKeyhole size={17} className="absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </label>
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
                <ArrowRight size={16} />
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">or continue with</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Google OAuth */}
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </a>

              <p className="mt-5 text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <a href="/signup" className="font-medium text-slate-800 hover:underline">
                  Sign up
                </a>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
