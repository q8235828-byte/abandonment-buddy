'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BarChart3, CheckCircle2,
  Circle, DollarSign, FlaskConical, Mail,
  MailCheck, MessageCircle, MousePointerClick,
  PackageSearch, RefreshCcw, Smartphone, TrendingUp,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Alert, EmptyState, LoadingRow, StatCard, StatusBadge } from '../components/Ui';
import { api, getApiErrorMessage } from '../lib/api';
import type { AbandonedOrder, DashboardStats } from '../lib/types';

// ── Revenue sparkline ─────────────────────────────────────────────────────────
function RevenueChart({ data }: { data: { date: string; revenue: number; recovered: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const recent = data.slice(-30);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <BarChart3 size={17} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Revenue recovered</h2>
            <p className="text-xs text-slate-400">Last 30 days</p>
          </div>
        </div>
        <span className="text-lg font-black text-teal-600">
          ${data.reduce((s, d) => s + d.revenue, 0).toFixed(2)}
        </span>
      </div>

      <div className="flex h-20 items-end gap-0.5">
        {recent.map((d, i) => {
          const h = max > 0 ? (d.revenue / max) * 100 : 0;
          return (
            <div key={i} className="group relative flex-1" title={`${d.date}: $${d.revenue.toFixed(2)} (${d.recovered} recovered)`}>
              <div
                className={`w-full rounded-t-sm transition-opacity ${h > 0 ? 'bg-teal-500' : 'bg-slate-100'}`}
                style={{ height: `${Math.max(h, h > 0 ? 8 : 4)}%`, opacity: h > 0 ? 0.5 + (i / recent.length) * 0.5 : 1 }}
              />
              {h > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block z-10">
                  {d.date.slice(5)}: ${d.revenue.toFixed(0)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{recent[0]?.date.slice(5) || ''}</span>
        <span>{recent[recent.length - 1]?.date.slice(5) || ''}</span>
      </div>
    </div>
  );
}

// ── Sequence funnel ───────────────────────────────────────────────────────────
function SequenceFunnel({ step1, step2, step3, recovered }: { step1: number; step2: number; step3: number; recovered: number }) {
  const steps = [
    { label: 'Step 1 sent',  value: step1,    color: 'bg-teal-500' },
    { label: 'Step 2 sent',  value: step2,    color: 'bg-teal-400' },
    { label: 'Step 3 sent',  value: step3,    color: 'bg-teal-300' },
    { label: 'Recovered',    value: recovered, color: 'bg-green-500' },
  ];
  const max = Math.max(step1, 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
          <TrendingUp size={17} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Sequence funnel</h2>
          <p className="text-xs text-slate-400">Email steps sent vs recovered</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {steps.map((s) => {
          const pct = max > 0 ? (s.value / max) * 100 : 0;
          return (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700">{s.label}</span>
                <span className="text-xs font-bold text-slate-900">{s.value.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${Math.max(pct, s.value > 0 ? 2 : 0)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Channel stats ─────────────────────────────────────────────────────────────
function ChannelStats({ stats }: { stats: DashboardStats }) {
  const channels = [
    { label: 'Email', icon: <Mail size={14} />, sent: stats.emailSent, recovered: stats.emailRecovered, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'WhatsApp', icon: <MessageCircle size={14} />, sent: stats.whatsappSent, recovered: stats.whatsappRecovered, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'SMS', icon: <Smartphone size={14} />, sent: stats.smsSent, recovered: stats.smsRecovered, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
          <MailCheck size={17} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Channel performance</h2>
          <p className="text-xs text-slate-400">Sent vs recovered per channel</p>
        </div>
      </div>

      <div className="space-y-2">
        {channels.map((ch) => (
          <div key={ch.label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ch.bg} ${ch.color}`}>
              {ch.icon}
            </div>
            <span className="flex-1 text-sm font-medium text-slate-700">{ch.label}</span>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">{ch.sent} sent</p>
              {ch.recovered > 0 && (
                <p className="text-[10px] text-green-600 font-semibold">{ch.recovered} recovered</p>
              )}
            </div>
            {ch.sent > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ch.bg} ${ch.color}`}>
                {Math.round((ch.recovered / ch.sent) * 100)}%
              </span>
            )}
          </div>
        ))}

        {/* Open & click rates */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <MailCheck size={12} className="text-slate-400" />
              <span className="text-xs text-slate-500">Open rate</span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              {stats.emailSent > 0 ? `${Math.round((stats.emailOpened / stats.emailSent) * 100)}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-400">{stats.emailOpened} opened</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <MousePointerClick size={12} className="text-slate-400" />
              <span className="text-xs text-slate-500">Click rate</span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              {stats.emailSent > 0 ? `${Math.round((stats.emailClicked / stats.emailSent) * 100)}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-400">{stats.emailClicked} clicked</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── A/B test panel ────────────────────────────────────────────────────────────
function AbTestPanel({ stats }: { stats: DashboardStats }) {
  const hasData = stats.abVariantASent > 0 || stats.abVariantBSent > 0;
  if (!hasData) return null;

  const rateA = stats.abVariantASent > 0 ? (stats.abVariantARecovered / stats.abVariantASent) * 100 : 0;
  const rateB = stats.abVariantBSent > 0 ? (stats.abVariantBRecovered / stats.abVariantBSent) * 100 : 0;
  const winner = rateA > rateB ? 'A' : rateB > rateA ? 'B' : null;

  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <FlaskConical size={17} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">A/B test results</h2>
          <p className="text-xs text-slate-400">Step 1 email variant performance</p>
        </div>
        {winner && (
          <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${
            winner === 'A' ? 'bg-teal-50 text-teal-700' : 'bg-violet-50 text-violet-700'
          }`}>
            Variant {winner} winning
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'A', sent: stats.abVariantASent, recovered: stats.abVariantARecovered, rate: rateA, color: 'teal', isWinner: winner === 'A' },
          { label: 'B', sent: stats.abVariantBSent, recovered: stats.abVariantBRecovered, rate: rateB, color: 'violet', isWinner: winner === 'B' },
        ].map((v) => (
          <div key={v.label} className={`rounded-xl border-2 p-4 ${v.isWinner ? `border-${v.color}-300 bg-${v.color}-50` : 'border-slate-100 bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wide ${v.isWinner ? `text-${v.color}-700` : 'text-slate-500'}`}>
                Variant {v.label}
              </span>
              {v.isWinner && <CheckCircle2 size={13} className={`text-${v.color}-500`} />}
            </div>
            <p className={`text-2xl font-black ${v.isWinner ? `text-${v.color}-600` : 'text-slate-700'}`}>
              {v.rate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-0.5">recovery rate</p>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <div className="flex justify-between"><span>Sent</span><span className="font-semibold text-slate-700">{v.sent}</span></div>
              <div className="flex justify-between"><span>Recovered</span><span className="font-semibold text-green-600">{v.recovered}</span></div>
            </div>
          </div>
        ))}
      </div>

      {winner && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Go to <Link href="/campaigns" className="text-teal-600 hover:underline">Campaigns → A/B Test</Link> to promote the winning variant.
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    abandonedCarts: 0, messagesSent: 0, recoveryRate: 0, revenueRecovered: 0,
    emailSent: 0, whatsappSent: 0, smsSent: 0,
    emailRecovered: 0, whatsappRecovered: 0, smsRecovered: 0,
    step1Sent: 0, step2Sent: 0, step3Sent: 0,
    abVariantASent: 0, abVariantBSent: 0, abVariantARecovered: 0, abVariantBRecovered: 0,
    emailOpened: 0, emailClicked: 0,
    dailyRevenue: [],
  });
  const [orders, setOrders]   = useState<AbandonedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError]     = useState('');
  const [message, setMessage] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true); setError('');
      const [statsRes, ordersRes] = await Promise.all([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<AbandonedOrder[]>('/abandonment/orders'),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load dashboard'));
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadDashboard(); }, []);

  const recentOrders   = useMemo(() => orders.slice(0, 6), [orders]);
  const activeOrders   = useMemo(() => orders.filter((o) => o.status === 'DETECTED').length, [orders]);
  const recoveredOrders = useMemo(() => orders.filter((o) => o.status === 'RECOVERED').length, [orders]);

  const runAbandonmentCheck = async () => {
    try {
      setChecking(true); setMessage(''); setError('');
      const response = await api.post('/abandonment/check');
      setMessage(`Checked ${response.data.checked} orders. ${response.data.abandoned} new abandoned carts detected.`);
      await loadDashboard();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to run abandonment check'));
    } finally { setChecking(false); }
  };

  return (
    <AppShell title="Dashboard" subtitle="Monitor recovery performance, sequence analytics, and A/B test results."
      action={
        <button onClick={runAbandonmentCheck} disabled={checking}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
          <RefreshCcw size={15} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking…' : 'Run check'}
        </button>
      }
    >
      <div className="space-y-6">
        {error && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}

        {/* ── Core KPIs ── */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Abandoned carts"   value={stats.abandonedCarts}                          helper={`${activeOrders} currently open`}   icon={<PackageSearch size={18} />} color="slate" />
          <StatCard label="Messages sent"     value={stats.messagesSent}                            helper={`${recoveredOrders} orders recovered`} icon={<MailCheck size={18} />}     color="violet" />
          <StatCard label="Recovery rate"     value={`${stats.recoveryRate}%`}                      helper="Recovered vs. tracked"               icon={<TrendingUp size={18} />}    color="amber" />
          <StatCard label="Revenue recovered" value={`$${Number(stats.revenueRecovered).toFixed(2)}`} helper="From recovered carts"              icon={<DollarSign size={18} />}    color="teal" />
        </section>

        {/* ── Revenue chart + Sequence funnel ── */}
        <section className="grid gap-6 xl:grid-cols-2">
          <RevenueChart data={stats.dailyRevenue} />
          <SequenceFunnel step1={stats.step1Sent} step2={stats.step2Sent} step3={stats.step3Sent} recovered={recoveredOrders} />
        </section>

        {/* ── Channel performance + A/B panel ── */}
        <section className="grid gap-6 xl:grid-cols-2">
          <ChannelStats stats={stats} />
          <AbTestPanel  stats={stats} />
        </section>

        {/* ── Orders + health ── */}
        <section className="grid gap-6 xl:grid-cols-[1fr_320px]">

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent abandoned orders</h2>
                <p className="text-xs text-slate-400">Latest carts tracked across all stores</p>
              </div>
              <Link href="/abandoned-orders" className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {loading ? (
              <div className="p-6"><LoadingRow label="Loading recent orders…" /></div>
            ) : recentOrders.length === 0 ? (
              <div className="p-6"><EmptyState title="No orders tracked yet" description="Connect a WooCommerce store and run a detection check." /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Store</th>
                      <th className="px-6 py-3">Value</th>
                      <th className="px-6 py-3">Channels</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentOrders.map((order) => {
                      const name = order.customerName || order.customerEmail || 'Unknown';
                      const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <tr key={order.id} className="transition hover:bg-slate-50/70 cursor-pointer group"
                          onClick={() => window.location.href = `/orders/${order.id}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{initials}</div>
                              <div>
                                <p className="font-medium text-slate-900 group-hover:text-teal-600 transition">{order.customerName || 'Unknown'}</p>
                                <p className="text-xs text-slate-400">{order.customerEmail || 'No email'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{order.store?.name || 'Store'}</td>
                          <td className="px-6 py-4 font-semibold text-slate-900">${Number(order.cartValue || 0).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              {order.emailSentAt    && <span title="Email sent"    className="rounded-full bg-teal-50 p-1 text-teal-500"><Mail size={11} /></span>}
                              {order.whatsappSentAt && <span title="WhatsApp sent" className="rounded-full bg-green-50 p-1 text-green-500"><MessageCircle size={11} /></span>}
                              {order.smsSentAt      && <span title="SMS sent"      className="rounded-full bg-blue-50 p-1 text-blue-500"><Smartphone size={11} /></span>}
                              {order.abVariant      && <span title={`A/B variant ${order.abVariant}`} className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-500">{order.abVariant}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Health panel */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><Activity size={17} /></div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Recovery health</h2>
                  <p className="text-xs text-slate-400">Current system status</p>
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                <HealthRow label="Detection queue" value={checking ? 'Running' : 'Ready'}  status={checking ? 'running' : 'ok'} />
                <HealthRow label="Open carts"      value={String(activeOrders)}            status={activeOrders > 0 ? 'warn' : 'ok'} />
                <HealthRow label="Total tracked"   value={String(orders.length)}           status="ok" />
                <HealthRow label="Recovered"       value={String(recoveredOrders)}         status={recoveredOrders > 0 ? 'ok' : 'neutral'} />
                <HealthRow label="Emails opened"   value={String(stats.emailOpened)}       status={stats.emailOpened > 0 ? 'ok' : 'neutral'} />
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick links</p>
              <div className="space-y-1">
                {[
                  { href: '/stores',    label: 'Manage stores' },
                  { href: '/campaigns', label: 'View campaigns' },
                  { href: '/templates', label: 'Edit templates' },
                ].map((link) => (
                  <Link key={link.href} href={link.href}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950">
                    {link.label}
                    <ArrowRight size={13} className="text-slate-300" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </section>
      </div>
    </AppShell>
  );
}

function HealthRow({ label, value, status }: { label: string; value: string; status: 'ok' | 'warn' | 'running' | 'neutral' }) {
  const dot = {
    ok:      <CheckCircle2 size={14} className="shrink-0 text-teal-500" />,
    warn:    <Circle size={14} className="shrink-0 fill-amber-400 text-amber-400" />,
    running: <RefreshCcw size={14} className="shrink-0 animate-spin text-violet-500" />,
    neutral: <Circle size={14} className="shrink-0 text-slate-300" />,
  }[status];

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-2">{dot}<span className="text-sm text-slate-600">{label}</span></div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </li>
  );
}
