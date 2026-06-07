'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { api, getApiErrorMessage } from '../lib/api';

type ProfileData = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition';

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600">{icon}</div>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function StatusBanner({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
      type === 'success' ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-rose-200 bg-rose-50 text-rose-700'
    }`}>
      {type === 'success' ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertTriangle size={15} className="shrink-0" />}
      {message}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile]     = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fullName, setFullName]   = useState('');
  const [savingInfo, setSavingInfo]   = useState(false);
  const [infoStatus, setInfoStatus]   = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword]   = useState(false);
  const [passwordStatus, setPasswordStatus]   = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    api.get<ProfileData>('/auth/profile')
      .then((res) => { setProfile(res.data); setFullName(res.data.fullName ?? ''); })
      .catch(() => router.push('/login'))
      .finally(() => setLoadingProfile(false));
  }, [router]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true); setInfoStatus(null);
    try {
      const res = await api.patch<{ user: ProfileData }>('/auth/profile', { fullName });
      setProfile((p) => (p ? { ...p, fullName: res.data.user.fullName } : p));
      const stored = localStorage.getItem('user');
      if (stored) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), fullName: res.data.user.fullName }));
      setInfoStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setInfoStatus({ type: 'error', message: getApiErrorMessage(err, 'Failed to update profile.') });
    } finally { setSavingInfo(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPasswordStatus(null);
    if (newPassword !== confirmPassword) { setPasswordStatus({ type: 'error', message: 'New passwords do not match.' }); return; }
    setSavingPassword(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordStatus({ type: 'success', message: 'Password changed successfully.' });
    } catch (err) {
      setPasswordStatus({ type: 'error', message: getApiErrorMessage(err, 'Failed to change password.') });
    } finally { setSavingPassword(false); }
  };

  const initials = (profile?.fullName ?? profile?.email ?? 'U')
    .split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  const memberSinceDay = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <AppShell title="My Profile" subtitle="Manage your account information and security">
      {loadingProfile ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">

          {/* ── Hero ── */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-xl">
            {/* Blobs */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-0 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute right-1/3 bottom-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />

            <div className="relative px-6 pt-8 pb-6">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-2xl font-bold text-white shadow-lg shadow-teal-500/30">
                    {initials}
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-950 bg-emerald-400">
                    <CheckCircle2 size={12} className="text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-white truncate">
                      {profile?.fullName || 'No name set'}
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-medium text-teal-300">
                      <Sparkles size={10} /> Active
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-400">
                    <Mail size={12} className="shrink-0" />
                    {profile?.email}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={11} className="shrink-0" />
                    Member since {memberSince}
                  </p>
                </div>
              </div>

              {/* Stats strip */}
              <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {[
                  { label: 'Plan',   value: 'Starter', sub: 'Free tier' },
                  { label: 'Status', value: 'Active',  sub: 'All systems go' },
                  { label: 'Since',  value: memberSince.split(' ')[1] ?? '—', sub: memberSince.split(' ')[0] ?? '' },
                ].map((s) => (
                  <div key={s.label} className="px-4 py-3.5 text-center">
                    <p className="text-base font-bold text-white">{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links bar */}
            <div className="relative border-t border-white/10 px-6 py-3 flex items-center gap-4">
              <p className="text-xs text-slate-500 mr-auto">Quick actions</p>
              <Link href="/settings" className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/20 transition">
                <Settings size={12} /> Settings
              </Link>
              <Link href="/stores" className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/20 transition">
                My Stores <ArrowRight size={11} />
              </Link>
            </div>
          </div>

          {/* ── Personal info ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader icon={<User size={16} />} title="Personal information" subtitle="Update your display name" />
            {infoStatus && <StatusBanner type={infoStatus.type} message={infoStatus.message} />}
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <Field label="Full name">
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className={inputCls} placeholder="John Doe" />
              </Field>
              <Field label="Email address">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                  <Mail size={14} className="shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-sm text-slate-500">{profile?.email}</span>
                  <span className="flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    <Lock size={9} /> Read-only
                  </span>
                </div>
              </Field>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={savingInfo}
                  className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition">
                  {savingInfo ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {savingInfo ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Change password ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader icon={<KeyRound size={16} />} title="Change password" subtitle="Use at least 6 characters with a mix of letters and numbers" />
            {passwordStatus && <StatusBanner type={passwordStatus.type} message={passwordStatus.message} />}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Field label="Current password">
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputCls} placeholder="Enter current password" required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New password">
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className={inputCls} placeholder="At least 6 characters" minLength={6} required />
                </Field>
                <Field label="Confirm new password">
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputCls} placeholder="Repeat new password" required />
                </Field>
              </div>

              {/* Password strength hint */}
              {newPassword.length > 0 && (
                <div className="flex items-center gap-2">
                  {['weak', 'fair', 'good', 'strong'].map((level, i) => (
                    <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                      newPassword.length > i * 3
                        ? i === 0 ? 'bg-rose-400' : i === 1 ? 'bg-amber-400' : i === 2 ? 'bg-teal-400' : 'bg-teal-500'
                        : 'bg-slate-100'
                    }`} />
                  ))}
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {newPassword.length < 4 ? 'Weak' : newPassword.length < 8 ? 'Fair' : newPassword.length < 12 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button type="submit" disabled={savingPassword}
                  className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition">
                  {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Account details ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader icon={<ShieldCheck size={16} />} title="Account details" subtitle="Your account information and current plan" />
            <dl className="divide-y divide-slate-50">
              {[
                { label: 'Account ID',    value: profile?.id ?? '—',          mono: true },
                { label: 'Email address', value: profile?.email ?? '—',       mono: false },
                { label: 'Member since',  value: memberSinceDay,              mono: false },
                { label: 'Current plan',  value: 'Starter — Free',            mono: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-slate-500 shrink-0">{row.label}</dt>
                  <dd className={`text-right text-sm font-medium break-all ${row.mono ? 'font-mono text-xs text-slate-400' : 'text-slate-900'}`}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ── Danger zone ── */}
          <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/60 to-white p-6">
            <div className="mb-4 flex items-center gap-3 border-b border-rose-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100">
                <AlertTriangle size={16} className="text-rose-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Danger zone</h2>
                <p className="text-xs text-rose-400">Permanent actions — cannot be undone</p>
              </div>
            </div>
            <div className="flex items-start justify-between gap-6">
              <p className="text-sm text-slate-500 leading-relaxed">
                Permanently delete your account, all stores, campaigns, and associated data. This action is irreversible.
              </p>
              <button disabled title="Contact support to delete your account"
                className="shrink-0 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-400 opacity-50 cursor-not-allowed shadow-sm">
                Delete account
              </button>
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
