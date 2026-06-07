'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, LockKeyhole, ShoppingCart } from 'lucide-react';
import { api, getApiErrorMessage } from '../lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.post('/auth/reset-password', { token, password });
      router.push('/login?reset=1');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to reset password.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-sm text-rose-700">
          Invalid reset link. Please request a new one.
        </p>
        <a href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-slate-800 hover:underline">
          Request new link
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            New password
          </span>
          <div className="relative">
            <LockKeyhole size={17} className="absolute left-3 top-3.5 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm"
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Confirm new password
          </span>
          <div className="relative">
            <LockKeyhole size={17} className="absolute left-3 top-3.5 text-slate-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm"
              placeholder="Repeat new password"
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
        {loading ? 'Saving...' : 'Set new password'}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,184,166,0.22),transparent_28%),radial-gradient(circle_at_78%_68%,rgba(245,158,11,0.16),transparent_28%)]" />
          <div className="relative flex h-full flex-col p-12 xl:p-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-slate-200">
                <ShoppingCart size={15} />
                WooCommerce recovery console
              </div>
              <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-tight tracking-normal">
                Set a new password.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Choose a strong password and you&apos;ll be back in your workspace right away.
              </p>
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
                Choose a new password
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your new password must be at least 6 characters.
              </p>
            </div>

            <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>

            <p className="mt-5 text-center text-sm text-slate-500">
              Remember it now?{' '}
              <a href="/login" className="font-medium text-slate-800 hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
