'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Circle, Clock, DollarSign,
  Globe, Laptop, Mail, MailCheck, MailOpen, MessageCircle,
  Monitor, MousePointerClick, Package, Phone, Smartphone,
  Tablet, User, Wifi, XCircle, Zap,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Alert, LoadingRow, StatusBadge } from '../../components/Ui';
import { api, getApiErrorMessage } from '../../lib/api';
import type { AbandonedOrder, CartItem } from '../../lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function elapsed(from?: string | null, to?: string | null) {
  if (!from || !to) return '';
  const ms = new Date(to).getTime() - new Date(from).getTime();
  const m  = Math.floor(ms / 60000);
  if (m < 60) return `+${m}m`;
  const h = Math.floor(m / 60);
  return `+${h}h${m % 60 > 0 ? `${m % 60}m` : ''}`;
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-medium text-slate-400 shrink-0">{label}</span>
      <span className={`text-xs text-right text-slate-800 font-medium break-all ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-slate-300">—</span>}
      </span>
    </div>
  );
}

// ── Device icon ───────────────────────────────────────────────────────────────
function DeviceIcon({ type }: { type?: string | null }) {
  if (type === 'mobile')  return <Smartphone size={14} className="text-blue-500" />;
  if (type === 'tablet')  return <Tablet size={14} className="text-purple-500" />;
  return <Monitor size={14} className="text-slate-500" />;
}

// ── Flag emoji from country code ──────────────────────────────────────────────
function countryFlag(code?: string | null) {
  if (!code || code.length !== 2) return '';
  return code.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(c.charCodeAt(0) + 0x1F1A5)
  );
}

// ── Timeline step ─────────────────────────────────────────────────────────────
function TimelineStep({
  label, time, icon, color, done, extra,
}: {
  label: string; time?: string | null; icon: React.ReactNode;
  color: string; done: boolean; extra?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-white transition-all ${
          done ? `${color} border-transparent` : 'border-slate-200 bg-white text-slate-300'
        }`}>
          {done ? icon : <Circle size={12} />}
        </div>
        <div className="w-0.5 flex-1 bg-slate-100 mt-1" />
      </div>
      <div className="pb-5 pt-0.5 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{label}</p>
          {done && time && <span className="text-[10px] text-slate-400 shrink-0">{fmt(time)}</span>}
          {!done && <span className="text-[10px] text-slate-300">Not yet</span>}
        </div>
        {extra && <div className="mt-1">{extra}</div>}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<AbandonedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<AbandonedOrder>(`/abandonment/orders/${id}`)
      .then((r) => setOrder(r.data))
      .catch((e) => setError(getApiErrorMessage(e, 'Failed to load order')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Order Detail" subtitle="Loading…">
        <LoadingRow label="Fetching order data…" />
      </AppShell>
    );
  }

  if (error || !order) {
    return (
      <AppShell title="Order Detail" subtitle="">
        <Alert type="error">{error || 'Order not found'}</Alert>
      </AppShell>
    );
  }

  const cartItems = (Array.isArray(order.cartSnapshot) ? order.cartSnapshot : []) as CartItem[];
  const cartTotal = cartItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const name      = order.customerName || order.customerEmail || 'Unknown customer';
  const initials  = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const emailSteps = [
    { label: 'Email step 1', time: order.emailSentAt,       step: 1 },
    { label: 'Email step 2', time: order.emailStep2SentAt,  step: 2 },
    { label: 'Email step 3', time: order.emailStep3SentAt,  step: 3 },
  ];

  const isRecovered = order.status === 'RECOVERED';

  return (
    <AppShell
      title="Order Detail"
      subtitle={`Cart ${order.externalOrderId} · ${fmtDate(order.createdAt)}`}
      action={
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
          <ArrowLeft size={14} /> Back
        </button>
      }
    >
      <div className="space-y-6">

        {/* ── Status banner ── */}
        <div className={`flex items-center justify-between gap-4 rounded-2xl border p-5 ${
          isRecovered
            ? 'border-green-200 bg-green-50'
            : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white font-bold text-sm ${
              isRecovered ? 'bg-green-500' : 'bg-slate-200 text-slate-600'
            }`}>
              {initials}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{name}</p>
              <p className="text-xs text-slate-400">{order.customerEmail || 'No email'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {order.abVariant && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                A/B · Variant {order.abVariant}
              </span>
            )}
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900">${Number(order.cartValue || 0).toFixed(2)}</p>
              <StatusBadge status={order.status} />
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

          {/* Left column */}
          <div className="space-y-5">

            {/* Cart items */}
            <Card>
              <CardHeader icon={<Package size={17} />} title="Cart items" subtitle={`${cartItems.length} item${cartItems.length !== 1 ? 's' : ''} · $${cartTotal.toFixed(2)} total`} />
              {cartItems.length === 0 ? (
                <p className="px-5 py-6 text-xs text-slate-400 text-center">No cart snapshot available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3 text-center">Qty</th>
                        <th className="px-5 py-3 text-right">Price</th>
                        <th className="px-5 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cartItems.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                          </td>
                          <td className="px-5 py-3.5 text-center text-sm text-slate-500">{item.quantity}</td>
                          <td className="px-5 py-3.5 text-right text-sm text-slate-500">${Number(item.price).toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-900">${Number(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td colSpan={3} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 text-right">Cart total</td>
                        <td className="px-5 py-3 text-right text-base font-black text-slate-900">${cartTotal.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>

            {/* Recovery timeline */}
            <Card>
              <CardHeader icon={<Clock size={17} />} title="Recovery timeline" subtitle="Sequence of events from abandonment to recovery" />
              <div className="px-5 pt-5 pb-2">
                <TimelineStep label="Cart abandoned" time={order.abandonedAt || order.createdAt} done color="bg-amber-400" icon={<Zap size={13} />} />

                {emailSteps.map((s) => (
                  <TimelineStep key={s.step} label={s.label} time={s.time} done={!!s.time} color="bg-teal-500" icon={<Mail size={13} />}
                    extra={s.step === 1 && order.emailSentAt ? (
                      <div className="flex gap-2 mt-1">
                        {order.emailOpenedAt  && <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-600"><MailOpen size={9} /> Opened {elapsed(order.emailSentAt, order.emailOpenedAt)}</span>}
                        {order.emailClickedAt && <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600"><MousePointerClick size={9} /> Clicked {elapsed(order.emailSentAt, order.emailClickedAt)}</span>}
                      </div>
                    ) : undefined}
                  />
                ))}

                {order.whatsappSentAt && (
                  <TimelineStep label="WhatsApp sent" time={order.whatsappSentAt} done color="bg-green-500" icon={<MessageCircle size={13} />} />
                )}
                {order.smsSentAt && (
                  <TimelineStep label="SMS sent" time={order.smsSentAt} done color="bg-blue-500" icon={<Smartphone size={13} />} />
                )}

                <TimelineStep label={isRecovered ? 'Order recovered' : 'Awaiting recovery'}
                  time={order.recoveredAt} done={isRecovered}
                  color="bg-green-500" icon={<CheckCircle2 size={13} />}
                  extra={isRecovered && order.recoveredBy ? (
                    <span className="text-[10px] text-green-600 font-medium">
                      via {order.recoveredBy}{order.recoveredByStep ? ` · Step ${order.recoveredByStep}` : ''}
                    </span>
                  ) : undefined}
                />
              </div>
            </Card>

          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Customer info */}
            <Card>
              <CardHeader icon={<User size={17} />} title="Customer" />
              <div className="px-5 py-3">
                <InfoRow label="Name"     value={order.customerName} />
                <InfoRow label="Email"    value={order.customerEmail} />
                <InfoRow label="Phone"    value={order.customerPhone} />
                <InfoRow label="Order ID" value={order.externalOrderId} mono />
                <InfoRow label="Session"  value={order.sessionId} mono />
                <InfoRow label="Status"   value={order.orderStatus} />
                <InfoRow label="Detected" value={fmt(order.createdAt)} />
                {order.recoveredAt && <InfoRow label="Recovered" value={fmt(order.recoveredAt)} />}
              </div>
            </Card>

            {/* Visitor intelligence */}
            <Card>
              <CardHeader icon={<Globe size={17} />} title="Visitor intelligence" subtitle="Captured on email open / click" />
              <div className="px-5 py-3">
                {!order.customerIp && !order.customerCountry ? (
                  <div className="py-4 text-center">
                    <Wifi size={20} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-xs text-slate-400">Not yet captured</p>
                    <p className="text-[11px] text-slate-300 mt-1">Data appears when the customer opens or clicks the recovery email</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <DeviceIcon type={order.customerDevice} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 capitalize">{order.customerDevice || 'Unknown device'}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {[order.customerBrowser, order.customerOs].filter(Boolean).join(' · ') || 'Unknown browser'}
                        </p>
                      </div>
                      {order.customerCountry && (
                        <span className="text-xl" title={order.customerCountry}>
                          {countryFlag(order.customerCountry)}
                        </span>
                      )}
                    </div>
                    <InfoRow label="IP address" value={order.customerIp} mono />
                    <InfoRow label="Country"    value={[countryFlag(order.customerCountry), order.customerCountry].filter(Boolean).join('  ')} />
                    <InfoRow label="City"       value={order.customerCity} />
                    <InfoRow label="Region"     value={order.customerRegion} />
                    <InfoRow label="ISP / Org"  value={order.customerIsp} />
                    <InfoRow label="Browser"    value={order.customerBrowser} />
                    <InfoRow label="OS"         value={order.customerOs} />
                    <InfoRow label="Device"     value={order.customerDevice} />
                  </>
                )}
              </div>
            </Card>

            {/* Email engagement */}
            <Card>
              <CardHeader icon={<MailCheck size={17} />} title="Email engagement" />
              <div className="px-5 py-3 space-y-2">
                {[
                  { label: 'Step 1 sent',  time: order.emailSentAt,      icon: <Mail size={12} />,              color: 'teal' },
                  { label: 'Step 2 sent',  time: order.emailStep2SentAt, icon: <Mail size={12} />,              color: 'teal' },
                  { label: 'Step 3 sent',  time: order.emailStep3SentAt, icon: <Mail size={12} />,              color: 'teal' },
                  { label: 'Opened',       time: order.emailOpenedAt,     icon: <MailOpen size={12} />,          color: 'amber' },
                  { label: 'Link clicked', time: order.emailClickedAt,    icon: <MousePointerClick size={12} />, color: 'violet' },
                ].map(({ label, time, icon, color }) => (
                  <div key={label} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${
                    time ? `bg-${color}-50 border border-${color}-100` : 'bg-slate-50 border border-slate-100'
                  }`}>
                    <div className={`flex items-center gap-2 ${time ? `text-${color}-600` : 'text-slate-300'}`}>
                      {time ? icon : <Circle size={12} />}
                      <span className={`text-xs font-medium ${time ? `text-${color}-700` : 'text-slate-400'}`}>{label}</span>
                    </div>
                    {time
                      ? <span className="text-[10px] text-slate-400">{fmt(time)}</span>
                      : <XCircle size={12} className="text-slate-200" />
                    }
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
