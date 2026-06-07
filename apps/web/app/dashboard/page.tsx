'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  DollarSign,
  MailCheck,
  PackageSearch,
  RefreshCcw,
  TrendingUp,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import {
  Alert,
  EmptyState,
  LoadingRow,
  StatCard,
  StatusBadge,
} from '../components/Ui';
import { api, getApiErrorMessage } from '../lib/api';
import type { AbandonedOrder, DashboardStats } from '../lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    abandonedCarts: 0,
    messagesSent: 0,
    recoveryRate: 0,
    revenueRecovered: 0,
  });
  const [orders, setOrders] = useState<AbandonedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, ordersRes] = await Promise.all([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<AbandonedOrder[]>('/abandonment/orders'),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDashboard(); }, []);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === 'DETECTED').length,
    [orders],
  );
  const recoveredOrders = useMemo(
    () => orders.filter((o) => o.status === 'RECOVERED').length,
    [orders],
  );

  const runAbandonmentCheck = async () => {
    try {
      setChecking(true);
      setMessage('');
      setError('');
      const response = await api.post('/abandonment/check');
      setMessage(
        `Checked ${response.data.checked} orders. ${response.data.abandoned} new abandoned carts detected.`,
      );
      await loadDashboard();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to run abandonment check'));
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppShell
      title="Dashboard"
      subtitle="Monitor recovery performance and run cart detection."
      action={
        <button
          onClick={runAbandonmentCheck}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCcw size={15} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking…' : 'Run check'}
        </button>
      }
    >
      <div className="space-y-6">
        {error && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}

        {/* ── Stat cards ── */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Abandoned carts"
            value={stats.abandonedCarts}
            helper={`${activeOrders} currently open`}
            icon={<PackageSearch size={18} />}
            color="slate"
          />
          <StatCard
            label="Messages sent"
            value={stats.messagesSent}
            helper={`${recoveredOrders} orders recovered`}
            icon={<MailCheck size={18} />}
            color="violet"
          />
          <StatCard
            label="Recovery rate"
            value={`${stats.recoveryRate}%`}
            helper="Recovered vs. tracked"
            icon={<TrendingUp size={18} />}
            color="amber"
          />
          <StatCard
            label="Revenue recovered"
            value={`$${Number(stats.revenueRecovered).toFixed(2)}`}
            helper="From recovered carts"
            icon={<DollarSign size={18} />}
            color="teal"
          />
        </section>

        {/* ── Main content row ── */}
        <section className="grid gap-6 xl:grid-cols-[1fr_320px]">

          {/* Recent orders */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent abandoned orders</h2>
                <p className="text-xs text-slate-400">Latest carts tracked across all stores</p>
              </div>
              <Link
                href="/abandoned-orders"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {loading ? (
              <div className="p-6">
                <LoadingRow label="Loading recent orders…" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No orders tracked yet"
                  description="Connect a WooCommerce store and run a detection check to start tracking abandoned carts."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Store</th>
                      <th className="px-6 py-3">Value</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentOrders.map((order) => {
                      const name = order.customerName || order.customerEmail || 'Unknown';
                      const initials = name
                        .split(' ')
                        .map((w: string) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <tr key={order.id} className="transition hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {initials}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {order.customerName || 'Unknown customer'}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {order.customerEmail || 'No email'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {order.store?.name || 'Store'}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            ${Number(order.cartValue || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={order.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recovery health */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                  <Activity size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Recovery health</h2>
                  <p className="text-xs text-slate-400">Current system status</p>
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                <HealthRow
                  label="Detection queue"
                  value={checking ? 'Running' : 'Ready'}
                  status={checking ? 'running' : 'ok'}
                />
                <HealthRow
                  label="Open carts"
                  value={String(activeOrders)}
                  status={activeOrders > 0 ? 'warn' : 'ok'}
                />
                <HealthRow
                  label="Total tracked"
                  value={String(orders.length)}
                  status="ok"
                />
                <HealthRow
                  label="Recovered"
                  value={String(recoveredOrders)}
                  status={recoveredOrders > 0 ? 'ok' : 'neutral'}
                />
              </ul>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick links</p>
              <div className="space-y-1">
                {[
                  { href: '/stores', label: 'Manage stores' },
                  { href: '/campaigns', label: 'View campaigns' },
                  { href: '/templates', label: 'Edit templates' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  >
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

function HealthRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'running' | 'neutral';
}) {
  const dot = {
    ok: <CheckCircle2 size={14} className="shrink-0 text-teal-500" />,
    warn: <Circle size={14} className="shrink-0 fill-amber-400 text-amber-400" />,
    running: <RefreshCcw size={14} className="shrink-0 animate-spin text-violet-500" />,
    neutral: <Circle size={14} className="shrink-0 text-slate-300" />,
  }[status];

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-2">
        {dot}
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </li>
  );
}
