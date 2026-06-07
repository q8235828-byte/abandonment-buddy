'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  ShoppingBag,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Alert } from '../components/Ui';
import { api, getApiErrorMessage } from '../lib/api';

type UsageItem = { used: number; limit: number };
type BillingStatus = {
  plan: string;
  planName: string;
  planExpiresAt: string | null;
  nextResetAt: string;
  usage: {
    orders: UsageItem;
    emails: UsageItem;
    sms: UsageItem;
    whatsapp: UsageItem;
  };
  plans: Array<{
    key: string;
    name: string;
    priceUsd: number;
    description: string;
    features: string[];
    limits: { orders: number; emails: number; sms: number; whatsapp: number };
    current: boolean;
  }>;
};

const planColors: Record<string, { ring: string; badge: string; btn: string; icon: string }> = {
  FREE:    { ring: 'border-slate-200',  badge: 'bg-slate-100 text-slate-600',    btn: 'bg-slate-950 hover:bg-slate-800',        icon: 'text-slate-500' },
  STARTER: { ring: 'border-teal-400',   badge: 'bg-teal-50 text-teal-700',       btn: 'bg-teal-600 hover:bg-teal-500',          icon: 'text-teal-500' },
  PRO:     { ring: 'border-violet-400', badge: 'bg-violet-50 text-violet-700',   btn: 'bg-violet-600 hover:bg-violet-500',      icon: 'text-violet-500' },
};

const usageIcons: Record<string, React.ReactNode> = {
  orders:   <ShoppingBag size={14} />,
  emails:   <Mail size={14} />,
  sms:      <Phone size={14} />,
  whatsapp: <MessageSquare size={14} />,
};

function UsageBar({ label, used, limit, icon }: { label: string; used: number; limit: number; icon: React.ReactNode }) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const danger = pct >= 90;
  const warn = pct >= 70;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-600">
          {icon} {label}
        </div>
        <span className={`font-semibold ${danger ? 'text-rose-600' : warn ? 'text-amber-600' : 'text-slate-700'}`}>
          {unlimited ? <span className="text-teal-600">Unlimited</span> : `${used} / ${limit.toLocaleString()}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${danger ? 'bg-rose-500' : warn ? 'bg-amber-400' : 'bg-teal-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, onUpgrade, upgrading }: {
  plan: BillingStatus['plans'][0];
  onUpgrade: (key: string) => void;
  upgrading: string | null;
}) {
  const c = planColors[plan.key] ?? planColors.FREE;
  const limitStr = (n: number) => n === -1 ? 'Unlimited' : n.toLocaleString();

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 shadow-sm transition ${c.ring} ${plan.current ? 'shadow-md' : ''}`}>
      {plan.current && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shadow ${c.badge}`}>
            <CheckCircle2 size={11} /> Current plan
          </span>
        </div>
      )}

      {plan.key === 'STARTER' && !plan.current && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold text-white shadow">
            <Sparkles size={11} /> Most popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{plan.name}</p>
        <div className="mt-1 flex items-end gap-1">
          <span className="text-3xl font-bold text-slate-950">
            {plan.priceUsd === 0 ? 'Free' : `$${plan.priceUsd}`}
          </span>
          {plan.priceUsd > 0 && <span className="mb-1 text-sm text-slate-400">/month</span>}
        </div>
        <p className="mt-1.5 text-sm text-slate-500">{plan.description}</p>
      </div>

      {/* Limits summary */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        {[
          { icon: <ShoppingBag size={12} />, label: 'Orders', val: limitStr(plan.limits.orders) },
          { icon: <Mail size={12} />,        label: 'Emails',  val: limitStr(plan.limits.emails) },
          { icon: <Phone size={12} />,       label: 'SMS',     val: limitStr(plan.limits.sms) },
          { icon: <MessageSquare size={12} />, label: 'WhatsApp', val: limitStr(plan.limits.whatsapp) },
        ].map((l) => (
          <div key={l.label} className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">{l.icon} {l.label}</div>
            <p className="text-xs font-bold text-slate-800">{l.val}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${c.icon}`} />
            {f}
          </li>
        ))}
      </ul>

      {plan.current ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-center text-sm font-semibold text-slate-400">
          Active plan
        </div>
      ) : plan.priceUsd === 0 ? null : (
        <button
          onClick={() => onUpgrade(plan.key)}
          disabled={upgrading === plan.key}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${c.btn}`}
        >
          {upgrading === plan.key ? (
            <><Loader2 size={14} className="animate-spin" /> Redirecting…</>
          ) : (
            <><Zap size={14} /> Upgrade to {plan.name}</>
          )}
        </button>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const successPlan = searchParams.get('success') === '1' ? searchParams.get('plan') : null;
  const cancelled = searchParams.get('cancelled') === '1';

  useEffect(() => {
    api.get<BillingStatus>('/billing/status')
      .then((res) => setStatus(res.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load billing info')))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planKey: string) => {
    setUpgrading(planKey);
    setError('');
    try {
      const res = await api.post<{ paymentUrl: string }>('/billing/create-payment', { plan: planKey });
      window.location.href = res.data.paymentUrl;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create payment'));
      setUpgrading(null);
    }
  };

  const nextReset = status?.nextResetAt
    ? new Date(status.nextResetAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  const expiresAt = status?.planExpiresAt
    ? new Date(status.planExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <AppShell title="Billing & Plans" subtitle="Manage your subscription and monitor usage limits">
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={26} className="animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="space-y-6">
          {error && <Alert type="error">{error}</Alert>}

          {successPlan && (
            <Alert type="success">
              🎉 Payment confirmed! Your <strong>{successPlan}</strong> plan is now active.
            </Alert>
          )}
          {cancelled && (
            <Alert type="error">Payment cancelled. Your plan has not changed.</Alert>
          )}

          {/* Current usage */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
                  <CreditCard size={17} className="text-slate-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Current usage</h2>
                  <p className="text-xs text-slate-400">Resets on {nextReset}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${planColors[status?.plan ?? 'FREE'].badge}`}>
                  <Sparkles size={11} />
                  {status?.planName} Plan
                </span>
                {expiresAt && (
                  <p className="mt-1 text-xs text-slate-400">Expires {expiresAt}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {status && Object.entries(status.usage).map(([key, val]) => (
                <UsageBar
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  used={val.used}
                  limit={val.limit}
                  icon={usageIcons[key]}
                />
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Choose a plan</h2>
            <div className="grid gap-5 md:grid-cols-3">
              {status?.plans.map((plan) => (
                <PlanCard key={plan.key} plan={plan} onUpgrade={handleUpgrade} upgrading={upgrading} />
              ))}
            </div>
          </div>

          {/* NOWPayments info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                <CreditCard size={18} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900">Secure crypto payments via NOWPayments</h3>
                <p className="mt-1 text-sm text-slate-500">
                  We accept <strong>Bitcoin, Ethereum, USDT, BNB</strong> and 100+ cryptocurrencies. Payments are processed instantly and your plan activates automatically once confirmed on-chain.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Bitcoin', 'Ethereum', 'USDT', 'BNB', 'USDC', 'LTC'].map((coin) => (
                    <span key={coin} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {coin}
                    </span>
                  ))}
                  <a href="https://nowpayments.io" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-teal-600 hover:border-teal-300">
                    +100 more <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
