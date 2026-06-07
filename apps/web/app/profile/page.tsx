'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Save,
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

function StatusBanner({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div
      className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
        type === 'success'
          ? 'border-teal-200 bg-teal-50 text-teal-700'
          : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      {type === 'success' ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertTriangle size={15} className="shrink-0" />}
      {message}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition';

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [fullName, setFullName] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoStatus, setInfoStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    api
      .get<ProfileData>('/auth/profile')
      .then((res) => {
        setProfile(res.data);
        setFullName(res.data.fullName ?? '');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoadingProfile(false));
  }, [router]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoStatus(null);
    try {
      const res = await api.patch<{ user: ProfileData }>('/auth/profile', { fullName });
      setProfile((p) => (p ? { ...p, fullName: res.data.user.fullName } : p));
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem('user', JSON.stringify({ ...parsed, fullName: res.data.user.fullName }));
      }
      setInfoStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setInfoStatus({ type: 'error', message: getApiErrorMessage(err, 'Failed to update profile.') });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({ type: 'success', message: 'Password changed successfully.' });
    } catch (err) {
      setPasswordStatus({ type: 'error', message: getApiErrorMessage(err, 'Failed to change password.') });
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = (profile?.fullName ?? profile?.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  return (
    <AppShell title="My Profile" subtitle="Manage your account information and security">
      {loadingProfile ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">

          {/* ── Hero card ── */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white shadow-xl">
            {/* decorative gradient blobs */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative flex items-center gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-2xl font-bold shadow-lg">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 shadow">
                  <CheckCircle2 size={11} className="text-white" />
                </div>
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xl font-bold">
                  {profile?.fullName || 'No name set'}
                </p>
                <p className="mt-0.5 truncate text-sm text-slate-400">{profile?.email}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
                  <Sparkles size={11} className="text-teal-400" />
                  Starter Plan &nbsp;·&nbsp; Member since {memberSince}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="relative mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
              {[
                { label: 'Plan', value: 'Free' },
                { label: 'Status', value: 'Active' },
                { label: 'Since', value: memberSince.split(' ')[1] ?? '—' },
              ].map((s) => (
                <div key={s.label} className="bg-slate-950/60 px-4 py-3 text-center">
                  <p className="text-base font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Personal information ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <User size={15} className="text-slate-600" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Personal information</h2>
                <p className="text-xs text-slate-400">Update your display name</p>
              </div>
            </div>

            {infoStatus && <StatusBanner type={infoStatus.type} message={infoStatus.message} />}

            <form onSubmit={handleSaveInfo} className="space-y-4">
              <Field label="Full name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputCls}
                  placeholder="John Doe"
                />
              </Field>

              <Field label="Email address">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                  <Mail size={14} className="shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-sm text-slate-500">{profile?.email}</span>
                  <span className="flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    <Lock size={9} />
                    Read-only
                  </span>
                </div>
              </Field>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingInfo ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {savingInfo ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Change password ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <KeyRound size={15} className="text-slate-600" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
                <p className="text-xs text-slate-400">Use at least 6 characters</p>
              </div>
            </div>

            {passwordStatus && <StatusBanner type={passwordStatus.type} message={passwordStatus.message} />}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <Field label="Current password">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputCls}
                  placeholder="Enter current password"
                  required
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New password">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputCls}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputCls}
                    placeholder="Repeat new password"
                    required
                  />
                </Field>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Account details ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <ShieldCheck size={15} className="text-slate-600" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Account details</h2>
                <p className="text-xs text-slate-400">Your account information and plan</p>
              </div>
            </div>

            <dl className="divide-y divide-slate-100">
              {[
                { label: 'Account ID', value: profile?.id ?? '—', mono: true },
                { label: 'Email address', value: profile?.email ?? '—', mono: false },
                {
                  label: 'Member since',
                  value: profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '—',
                  mono: false,
                },
                { label: 'Current plan', value: 'Starter (Free)', mono: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-slate-500">{row.label}</dt>
                  <dd
                    className={`text-right text-sm font-medium text-slate-900 break-all ${
                      row.mono ? 'font-mono text-xs text-slate-500' : ''
                    }`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ── Danger zone ── */}
          <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                <AlertTriangle size={15} className="text-rose-500" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Danger zone</h2>
                <p className="text-xs text-rose-400">Permanent actions — cannot be undone</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-6">
              <p className="text-sm text-slate-500">
                Permanently delete your account, stores, campaigns, and all associated data.
              </p>
              <button
                disabled
                title="Contact support to delete your account"
                className="shrink-0 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-500 opacity-50 cursor-not-allowed shadow-sm"
              >
                Delete account
              </button>
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
