'use client';

import { useState } from 'react';
import { ArrowLeft, Mail, ShoppingCart } from 'lucide-react';
import { api, getApiErrorMessage } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Something went wrong. Please try again.'));
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
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-slate-200">
                <ShoppingCart size={15} />
                WooCommerce recovery console
              </div>
              <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-tight tracking-normal">
                Forgot your password?
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                No worries. Enter your email and we&apos;ll send you a link to get back into your account.
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
                Reset your password
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter the email associated with your account.
              </p>
            </div>

            {sent ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                  <Mail size={22} className="text-teal-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">Check your inbox</h3>
                <p className="mt-2 text-sm text-slate-500">
                  If <span className="font-medium text-slate-700">{email}</span> is linked to an account, a reset link has been sent. The link expires in 1 hour.
                </p>
                <a
                  href="/login"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:underline"
                >
                  <ArrowLeft size={15} />
                  Back to sign in
                </a>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
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
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>

                <a
                  href="/login"
                  className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft size={15} />
                  Back to sign in
                </a>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
