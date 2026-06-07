'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, CheckCircle2, CreditCard, DollarSign, Globe,
  Loader2, Mail, MapPin, Monitor, PackageSearch, RefreshCcw,
  Search, Shield, ShieldCheck, Smartphone, Store, User, Users, X,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Alert, StatCard, StatusBadge } from '../components/Ui';
import { api, getApiErrorMessage } from '../lib/api';

const money = (v: unknown) => `$${Number(v || 0).toFixed(2)}`;

type AdminUser = {
  id: string; email: string; fullName: string | null;
  plan: string; planExpiresAt: string | null;
  ordersUsed: number; emailsUsed: number; smsUsed: number; whatsappUsed: number;
  customOrderLimit: number | null; customEmailLimit: number | null;
  customSmsLimit: number | null; customWhatsappLimit: number | null;
  isAdmin: boolean; lastLoginIp: string | null; lastLoginAt: string | null;
  country: string | null; city: string | null;
  storeCount: number; paymentCount: number;
  createdAt: string;
  limits: { orders: number; emails: number; sms: number; whatsapp: number };
};

type Stats = {
  totalUsers: number; totalStores: number; totalOrders: number; totalRevenue: number;
  planBreakdown: Array<{ plan: string; count: number }>;
};

const planColors: Record<string, string> = {
  FREE:    'bg-slate-100 text-slate-600',
  STARTER: 'bg-teal-50 text-teal-700',
  PRO:     'bg-violet-50 text-violet-700',
};

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserModal({ user, onClose, onUpdated }: { user: AdminUser; onClose: () => void; onUpdated: () => void }) {
  const [plan, setPlan]           = useState(user.plan);
  const [months, setMonths]       = useState(1);
  const [orderLimit, setOrderLimit] = useState(String(user.customOrderLimit ?? ''));
  const [emailLimit, setEmailLimit] = useState(String(user.customEmailLimit ?? ''));
  const [smsLimit, setSmsLimit]   = useState(String(user.customSmsLimit ?? ''));
  const [waLimit, setWaLimit]     = useState(String(user.customWhatsappLimit ?? ''));
  const [saving, setSaving]       = useState(false);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const savePlan = async () => {
    setSaving(true); setStatus(null);
    try {
      await api.patch(`/admin/users/${user.id}/plan`, { plan, months });
      setStatus({ type: 'success', msg: 'Plan updated.' });
      onUpdated();
    } catch (err) { setStatus({ type: 'error', msg: getApiErrorMessage(err, 'Failed') }); }
    finally { setSaving(false); }
  };

  const saveLimits = async () => {
    setSaving(true); setStatus(null);
    try {
      await api.patch(`/admin/users/${user.id}/limits`, {
        customOrderLimit:    orderLimit ? Number(orderLimit) : null,
        customEmailLimit:    emailLimit ? Number(emailLimit) : null,
        customSmsLimit:      smsLimit   ? Number(smsLimit)   : null,
        customWhatsappLimit: waLimit    ? Number(waLimit)    : null,
      });
      setStatus({ type: 'success', msg: 'Custom limits saved.' });
      onUpdated();
    } catch (err) { setStatus({ type: 'error', msg: getApiErrorMessage(err, 'Failed') }); }
    finally { setSaving(false); }
  };

  const resetUsage = async () => {
    setResetting(true); setStatus(null);
    try {
      await api.post(`/admin/users/${user.id}/reset-usage`);
      setStatus({ type: 'success', msg: 'Usage reset to 0.' });
      onUpdated();
    } catch (err) { setStatus({ type: 'error', msg: getApiErrorMessage(err, 'Failed') }); }
    finally { setResetting(false); }
  };

  const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white text-sm font-bold">
              {(user.fullName || user.email)[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user.fullName || 'No name'}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${planColors[user.plan] ?? planColors.FREE}`}>{user.plan}</span>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
              <X size={16} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {status && (
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${status.type === 'success' ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {status.msg}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Mail size={13} />,    label: 'Email',        val: user.email },
              { icon: <Store size={13} />,   label: 'Stores',       val: String(user.storeCount) },
              { icon: <Globe size={13} />,   label: 'Country',      val: user.country || '—' },
              { icon: <MapPin size={13} />,  label: 'City',         val: user.city || '—' },
              { icon: <Monitor size={13} />, label: 'Last IP',      val: user.lastLoginIp || '—' },
              { icon: <User size={13} />,    label: 'Last login',   val: fmt(user.lastLoginAt) },
              { icon: <CreditCard size={13} />, label: 'Payments',  val: String(user.paymentCount) },
              { icon: <Shield size={13} />,  label: 'Joined',       val: fmt(user.createdAt) },
            ].map((r) => (
              <div key={r.label} className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">{r.icon} {r.label}</div>
                <p className="text-sm font-semibold text-slate-800 truncate">{r.val}</p>
              </div>
            ))}
          </div>

          {/* Current usage */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Current Usage</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Orders',    used: user.ordersUsed,   limit: user.limits.orders },
                { label: 'Emails',    used: user.emailsUsed,   limit: user.limits.emails },
                { label: 'SMS',       used: user.smsUsed,      limit: user.limits.sms },
                { label: 'WhatsApp',  used: user.whatsappUsed, limit: user.limits.whatsapp },
              ].map((u) => {
                const unlimited = u.limit === -1;
                const pct = unlimited ? 0 : Math.min(100, Math.round((u.used / u.limit) * 100));
                return (
                  <div key={u.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{u.label}</span>
                      <span className="font-semibold text-slate-700">{unlimited ? `${u.used} / ∞` : `${u.used} / ${u.limit}`}</span>
                    </div>
                    {!unlimited && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-teal-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={resetUsage} disabled={resetting}
              className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
              {resetting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Reset usage to 0
            </button>
          </div>

          {/* Change plan */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Change Plan</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end">
              <div>
                <p className="mb-1.5 text-xs text-slate-500">Plan</p>
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputCls}>
                  <option value="FREE">Free</option>
                  <option value="STARTER">Starter ($20)</option>
                  <option value="PRO">Pro ($50)</option>
                </select>
              </div>
              <div>
                <p className="mb-1.5 text-xs text-slate-500">Months</p>
                <input type="number" min={1} max={24} value={months} onChange={(e) => setMonths(Number(e.target.value))}
                  className={`${inputCls} w-20`} />
              </div>
              <button onClick={savePlan} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Apply
              </button>
            </div>
            {user.planExpiresAt && (
              <p className="mt-2 text-xs text-slate-400">Current plan expires: {fmt(user.planExpiresAt)}</p>
            )}
          </div>

          {/* Custom limits */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Custom Limits Override</p>
            <p className="mb-3 text-xs text-slate-400">Leave blank to use plan defaults. Set -1 for unlimited.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Orders / month',   val: orderLimit, set: setOrderLimit },
                { label: 'Emails / month',   val: emailLimit, set: setEmailLimit },
                { label: 'SMS / month',      val: smsLimit,   set: setSmsLimit },
                { label: 'WhatsApp / month', val: waLimit,    set: setWaLimit },
              ].map((f) => (
                <div key={f.label}>
                  <p className="mb-1.5 text-xs text-slate-500">{f.label}</p>
                  <input type="number" value={f.val} onChange={(e) => f.set(e.target.value)}
                    placeholder="Plan default" className={inputCls} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={saveLimits} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50 transition">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Save limits
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const loadData = async (q = '') => {
    try {
      setLoading(true); setError('');
      const [statsRes, usersRes] = await Promise.all([
        api.get<Stats>('/admin/stats'),
        api.get<AdminUser[]>(`/admin/users${q ? `?search=${encodeURIComponent(q)}` : ''}`),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        router.push('/admin/login');
        return;
      }
      setError(getApiErrorMessage(err, 'Admin access denied or failed to load'));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/admin/login'); return; }
    void loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); void loadData(search); };

  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const planBreakdown = stats?.planBreakdown ?? [];
  const free    = planBreakdown.find((p) => p.plan === 'FREE')?.count    ?? 0;
  const starter = planBreakdown.find((p) => p.plan === 'STARTER')?.count ?? 0;
  const pro     = planBreakdown.find((p) => p.plan === 'PRO')?.count     ?? 0;

  return (
    <AppShell title="Admin Panel" subtitle="Manage all customers, plans, and platform usage">
      {selected && (
        <UserModal
          user={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { void loadData(search); setSelected(null); }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={26} className="animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="space-y-6">
          {error && <Alert type="error">{error}</Alert>}

          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total customers" value={stats?.totalUsers ?? 0}           helper={`${free} free · ${starter} starter · ${pro} pro`} icon={<Users size={18} />}       color="slate" />
            <StatCard label="Total stores"    value={stats?.totalStores ?? 0}          helper="Connected WooCommerce stores"                     icon={<Store size={18} />}        color="teal" />
            <StatCard label="Total orders"    value={stats?.totalOrders ?? 0}          helper="All carts tracked"                                icon={<PackageSearch size={18} />} color="amber" />
            <StatCard label="Total revenue"   value={money(stats?.totalRevenue ?? 0)} helper="Confirmed crypto payments"                        icon={<DollarSign size={18} />}    color="violet" />
          </section>

          {/* Plan breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Plan Distribution</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 grid grid-cols-3 gap-3">
                {[
                  { label: 'Free',    count: free,    color: 'bg-slate-200' },
                  { label: 'Starter', count: starter, color: 'bg-teal-400' },
                  { label: 'Pro',     count: pro,     color: 'bg-violet-500' },
                ].map((p) => {
                  const total = (stats?.totalUsers ?? 0) || 1;
                  return (
                    <div key={p.label} className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{p.label}</span>
                        <span className="font-semibold text-slate-700">{p.count}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${p.color}`} style={{ width: `${Math.round((p.count / total) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Users table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">All customers</h2>
                <p className="text-xs text-slate-400 mt-0.5">{users.length} total · click a row to manage</p>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search email, country…"
                    className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition" />
                </div>
                <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">
                  Search
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Plan</th>
                    <th className="px-6 py-3">Usage</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Stores</th>
                    <th className="px-6 py-3">Joined</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((user) => {
                    const initials = (user.fullName || user.email).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                    const orderPct = user.limits.orders === -1 ? 0 : Math.round((user.ordersUsed / user.limits.orders) * 100);
                    return (
                      <tr key={user.id} onClick={() => setSelected(user)}
                        className="cursor-pointer transition hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.fullName || '—'}</p>
                              <p className="text-xs text-slate-400">{user.email}</p>
                            </div>
                            {user.isAdmin && <ShieldCheck size={13} className="text-violet-500" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${planColors[user.plan] ?? planColors.FREE}`}>
                            {user.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 w-28">
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Orders</span>
                              <span className="font-medium">{user.ordersUsed}/{user.limits.orders === -1 ? '∞' : user.limits.orders}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${orderPct >= 90 ? 'bg-rose-500' : orderPct >= 70 ? 'bg-amber-400' : 'bg-teal-500'}`}
                                style={{ width: `${Math.min(100, orderPct)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            {user.country ? (
                              <><Globe size={12} className="text-slate-400" /> {user.city ? `${user.city}, ` : ''}{user.country}</>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </div>
                          {user.lastLoginIp && <p className="text-xs text-slate-400 font-mono mt-0.5">{user.lastLoginIp}</p>}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{user.storeCount}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{fmt(user.createdAt)}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={user.planExpiresAt && new Date(user.planExpiresAt) < new Date() ? 'EXPIRED' : 'ACTIVE'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
