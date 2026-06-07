'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Lock, Mail, Shield } from 'lucide-react';
import { api, getApiErrorMessage } from '../../lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      // Step 1: Login
      const res = await api.post<{ token: string; user: any }>('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);

      // Step 2: Verify admin access by calling a protected admin endpoint
      try {
        await api.get('/admin/stats');
      } catch {
        localStorage.removeItem('token');
        setError('Access denied. This account does not have admin privileges.');
        return;
      }

      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/admin');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/30">
            <Shield size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="mt-1 text-sm text-slate-400">Abandonment Buddy · Restricted access</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">
          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <Lock size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Admin email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-teal-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 focus:border-teal-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-400 disabled:opacity-60 transition">
              {loading ? <><Loader2 size={15} className="animate-spin" /> Verifying…</> : <><Shield size={15} /> Sign in to admin</>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            Unauthorized access is prohibited and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
