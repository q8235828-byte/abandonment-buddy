'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  ExternalLink,
  Mail,
  Package,
  PackageSearch,
  Phone,
  RefreshCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
  X,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Alert, EmptyState, LoadingRow, StatCard, StatusBadge } from '../components/Ui';
import { api, getApiErrorMessage } from '../lib/api';
import type { AbandonedOrder, CartItem } from '../lib/types';

// ── Order Detail Modal ────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400 shrink-0 w-28">{label}</dt>
      <dd className={`text-sm text-right text-slate-900 break-all ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</dd>
    </div>
  );
}

function OrderDetailModal({ order, onClose }: { order: AbandonedOrder; onClose: () => void }) {
  const items: CartItem[] = Array.isArray(order.cartSnapshot) ? order.cartSnapshot : [];
  const nameParts = (order.customerName || '').trim().split(' ');
  const firstName = nameParts[0] || '—';
  const lastName = nameParts.slice(1).join(' ') || '—';

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const statusColor: Record<string, string> = {
    DETECTED:  'bg-amber-50 text-amber-700 border-amber-200',
    RECOVERED: 'bg-teal-50 text-teal-700 border-teal-200',
    EXPIRED:   'bg-slate-100 text-slate-500 border-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950">
              <ShoppingCart size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Order details</p>
              <p className="font-mono text-xs text-slate-400">{order.externalOrderId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor[order.status] ?? statusColor.EXPIRED}`}>
              {order.status}
            </span>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
              <X size={16} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Customer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <User size={14} className="text-slate-500" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-lg bg-white border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">First name</p>
                <p className="font-semibold text-slate-900">{firstName}</p>
              </div>
              <div className="rounded-lg bg-white border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Last name</p>
                <p className="font-semibold text-slate-900">{lastName}</p>
              </div>
            </div>

            <dl>
              {order.customerEmail && (
                <div className="flex items-center gap-2 py-2 border-b border-slate-200">
                  <Mail size={13} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 w-14 shrink-0">Email</span>
                  <a href={`mailto:${order.customerEmail}`} className="text-sm font-medium text-teal-600 hover:underline truncate">
                    {order.customerEmail}
                  </a>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-2 py-2">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 w-14 shrink-0">Phone</span>
                  <a href={`tel:${order.customerPhone}`} className="text-sm font-medium text-teal-600 hover:underline">
                    {order.customerPhone}
                  </a>
                </div>
              )}
            </dl>
          </div>

          {/* Cart items */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 border-b border-slate-200">
              <Package size={14} className="text-slate-500" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cart items — {items.length} product{items.length !== 1 ? 's' : ''}
              </p>
            </div>

            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No cart items recorded</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Product</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Price</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                              <ShoppingBag size={14} className="text-slate-400" />
                            </div>
                          )}
                          <span className="font-medium text-slate-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">×{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600">${item.price?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">${item.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-slate-700">Cart total</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-slate-950">
                      ${Number(order.cartValue || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Order info */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Store size={14} className="text-slate-500" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order information</p>
            </div>
            <dl>
              <InfoRow label="Order ID"    value={order.externalOrderId} mono />
              <InfoRow label="Session ID"  value={order.sessionId} mono />
              <InfoRow label="Store"       value={order.store?.name} />
              <InfoRow label="WC Status"   value={order.orderStatus} />
              <InfoRow label="Abandoned"   value={fmt(order.abandonedAt)} />
              <InfoRow label="Recovered"   value={fmt(order.recoveredAt)} />
              <InfoRow label="Email sent"  value={fmt(order.emailSentAt)} />
              <InfoRow label="Detected"    value={fmt(order.createdAt)} />
              <InfoRow label="Updated"     value={fmt(order.updatedAt)} />
            </dl>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
          {order.customerEmail && (
            <a
              href={`mailto:${order.customerEmail}?subject=Your cart is waiting&body=Hi ${firstName},%0A%0AYou left items in your cart. Complete your order here.`}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Mail size={14} /> Email customer
            </a>
          )}
          {order.store?.domain && (
            <a
              href={`https://${order.store.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink size={14} /> Visit store
            </a>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const statusOptions = ['ALL', 'DETECTED', 'RECOVERED', 'EXPIRED'];

export default function AbandonedOrdersPage() {
  const [orders, setOrders]           = useState<AbandonedOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [checking, setChecking]       = useState(false);
  const [error, setError]             = useState('');
  const [message, setMessage]         = useState('');
  const [selected, setSelected]       = useState<AbandonedOrder | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get<AbandonedOrder[]>('/abandonment/orders');
      setOrders(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchOrders(); }, []);

  const filteredOrders = useMemo(() => {
    const search = query.toLowerCase().trim();
    return orders.filter((o) => {
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchesSearch = !search || [o.externalOrderId, o.customerName, o.customerEmail, o.customerPhone, o.store?.name]
        .filter(Boolean).join(' ').toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [orders, query, statusFilter]);

  const totals = useMemo(() => {
    const detected  = orders.filter((o) => o.status === 'DETECTED').length;
    const recovered = orders.filter((o) => o.status === 'RECOVERED');
    const revenue   = recovered.reduce((sum, o) => sum + Number(o.cartValue || 0), 0);
    return { detected, recovered: recovered.length, revenue };
  }, [orders]);

  const runCheck = async () => {
    try {
      setChecking(true);
      setMessage(''); setError('');
      const res = await api.post('/abandonment/check');
      setMessage(`Detection complete: ${res.data.abandoned} new abandoned carts found.`);
      await fetchOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to run detection'));
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppShell
      title="Abandoned orders"
      subtitle="Search, filter, and triage carts waiting for recovery."
      action={
        <button onClick={runCheck} disabled={checking}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          <RefreshCcw size={16} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking…' : 'Run detection'}
        </button>
      }
    >
      {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} />}

      <div className="space-y-6">
        {error   && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}

        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Tracked orders"    value={orders.length}                     helper="All webhook orders"    icon={<ShoppingBag size={19} />} />
          <StatCard label="Detected carts"    value={totals.detected}                   helper="Awaiting recovery"     icon={<PackageSearch size={19} />} />
          <StatCard label="Recovered revenue" value={`$${totals.revenue.toFixed(2)}`}  helper={`${totals.recovered} recovered`} icon={<DollarSign size={19} />} />
        </section>

        {/* Table */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-base font-semibold">Order queue</h2>
              <p className="text-sm text-slate-500">Click <strong>View</strong> to see full customer and cart details.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search orders"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm sm:w-72" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-5"><LoadingRow label="Loading orders…" /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No matching orders" description="Try a different search or run detection after webhook orders arrive." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Order</th>
                    <th className="px-5 py-3 text-left font-semibold">Customer</th>
                    <th className="px-5 py-3 text-left font-semibold">Store</th>
                    <th className="px-5 py-3 text-left font-semibold">Cart value</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-left font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const items = Array.isArray(order.cartSnapshot) ? order.cartSnapshot : [];
                    return (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-semibold text-slate-950">{order.externalOrderId}</p>
                          <p className="mt-1 text-xs text-slate-500">WC: {order.orderStatus || 'unknown'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-950">{order.customerName || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{order.customerEmail || 'No email'}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{order.store?.name || '—'}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">${Number(order.cartValue || 0).toFixed(2)}</p>
                          <p className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setSelected(order)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-950 hover:text-white hover:border-slate-950 transition"
                          >
                            <User size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
