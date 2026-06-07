'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
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

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function StatusBanner({
  type,
  message,
}: {
  type: 'success' | 'error';
  message: string;
}) {
  return (
    <div
      className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        type === 'success'
          ? 'border-teal-200 bg-teal-50 text-teal-700'
          : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 size={16} className="shrink-0" />
      ) : (
        <AlertTriangle size={16} className="shrink-0" />
      )}
      {message}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Personal info form
  const [fullName, setFullName] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoStatus, setInfoStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password form
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
      // Sync localStorage
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

  return (
    <AppShell
      title="My Profile"
      subtitle="Manage your account information and password"
    >
      {loadingProfile ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-10">

          {/* ── Avatar header ── */}
          <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xl font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {profile?.fullName || 'No name set'}
              </p>
              <p className="text-sm text-slate-500">{profile?.email}</p>
              <p className="mt-1 text-xs text-slate-400">
                Member since{' '}
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>

          {/* ── Personal information ── */}
          <Section
            title="Personal information"
            description="Update your display name. Your email address cannot be changed."
            icon={<User size={16} />}
          >
            {infoStatus && (
              <StatusBanner type={infoStatus.type} message={infoStatus.message} />
            )}
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Mail size={15} className="shrink-0 text-slate-400" />
                  <span className="text-sm text-slate-500">{profile?.email}</span>
                  <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500">
                    Read-only
                  </span>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingInfo ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {savingInfo ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </Section>

          {/* ── Change password ── */}
          <Section
            title="Change password"
            description="Use a strong password of at least 6 characters. You will stay signed in after changing."
            icon={<KeyRound size={16} />}
          >
            {passwordStatus && (
              <StatusBanner type={passwordStatus.type} message={passwordStatus.message} />
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Repeat new password"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingPassword ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <KeyRound size={14} />
                  )}
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </Section>

          {/* ── Account details ── */}
          <Section
            title="Account details"
            description="Information about your account and current plan."
            icon={<ShieldCheck size={16} />}
          >
            <dl className="divide-y divide-slate-100">
              {[
                { label: 'Account ID', value: profile?.id ?? '—' },
                {
                  label: 'Email address',
                  value: profile?.email ?? '—',
                },
                {
                  label: 'Member since',
                  value: profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—',
                },
                { label: 'Current plan', value: 'Starter (Free)' },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-3.5">
                  <dt className="text-sm text-slate-500">{row.label}</dt>
                  <dd className="text-right text-sm font-medium text-slate-900 break-all">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* ── Danger zone ── */}
          <Section
            title="Danger zone"
            description="Permanent actions that cannot be undone. Proceed with care."
            icon={<AlertTriangle size={16} />}
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-slate-900">Delete account</p>
                <p className="mt-1 text-sm text-slate-500">
                  Permanently delete your account and all associated stores, campaigns, and data.
                </p>
              </div>
              <button
                disabled
                className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 opacity-50 cursor-not-allowed"
                title="Contact support to delete your account"
              >
                Delete account
              </button>
            </div>
          </Section>

        </div>
      )}
    </AppShell>
  );
}
