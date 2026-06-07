'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Download,
  ExternalLink,
  PlugZap,
  RotateCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Alert, LoadingRow, StatusBadge } from '../../components/Ui';
import { API_BASE_URL, api, getApiErrorMessage } from '../../lib/api';
import type { Store } from '../../lib/types';

type HealthStatus = {
  connected: boolean;
  storeId: string;
  storeName: string;
  status: string;
};

function CopyField({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(!secret);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
        {secret && (
          <button
            onClick={() => setShow((s) => !s)}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="truncate font-mono text-xs text-slate-700">
            {show ? value : '••••••••••••••••••••••••••••••'}
          </p>
        </div>
        <button
          onClick={copy}
          title="Copy"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          {copied ? <ClipboardCheck size={15} className="text-teal-500" /> : <Clipboard size={15} />}
        </button>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  children,
  done = false,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            done
              ? 'bg-teal-500 text-white'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {done ? <CheckCircle2 size={16} /> : number}
        </div>
        <div className="mt-2 flex-1 border-l border-dashed border-slate-200" />
      </div>
      <div className="pb-8 pt-0.5">
        <p className="mb-2 font-semibold text-slate-900">{title}</p>
        <div className="text-sm leading-6 text-slate-500">{children}</div>
      </div>
    </div>
  );
}

export default function StoreDetailsPage() {
  const params = useParams();
  const storeId = params.id as string;

  const [stores, setStores] = useState<Store[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const store = useMemo(() => stores.find((s) => s.id === storeId), [storeId, stores]);

  const webhookCartUrl = `${API_BASE_URL}/webhooks/cart-session/${storeId}`;
  const webhookOrderUrl = `${API_BASE_URL}/webhooks/order-completed/${storeId}`;
  const healthUrl = `${API_BASE_URL}/webhooks/health/${storeId}`;
  const isConnected = store?.status === 'CONNECTED';

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await api.get<Store[]>('/stores');
      setStores(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load store'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchStores(); }, []);

  const connectStore = async () => {
    if (!store?.apiKey || !store?.apiSecret) return;
    try {
      setConnecting(true);
      setError('');
      await api.post('/stores/connect', { apiKey: store.apiKey, apiSecret: store.apiSecret });
      setMessage('Store connected successfully.');
      await fetchStores();
      await checkHealth();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Connection failed'));
    } finally {
      setConnecting(false);
    }
  };

  const checkHealth = async () => {
    try {
      setTesting(true);
      setError('');
      const res = await api.get<HealthStatus>(`/webhooks/health/${storeId}`);
      setHealth(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Health check failed'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppShell
      title={store?.name ?? 'Store setup'}
      subtitle="Connect your WooCommerce store and activate cart tracking."
      action={
        <Link
          href="/stores"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={15} /> All stores
        </Link>
      }
    >
      <div className="space-y-6">
        {error && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}

        {loading ? (
          <LoadingRow label="Loading store…" />
        ) : !store ? (
          <Alert type="error">Store not found.</Alert>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

            {/* ── Left: setup wizard ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Setup guide</h2>
                  <p className="text-xs text-slate-400">Follow these steps to activate cart tracking</p>
                </div>
                <StatusBadge status={store.status} />
              </div>

              <div>
                <Step number={1} title="Create your store" done>
                  Store <strong>{store.name}</strong> was created. Credentials are ready below.
                </Step>

                <Step number={2} title="Download & install the plugin" done={isConnected}>
                  <p className="mb-3">
                    Download the WooCommerce plugin, then install it via{' '}
                    <strong>WordPress Admin → Plugins → Add New → Upload Plugin</strong>.
                  </p>
                  <a
                    href="/api/plugin"
                    download="abandonment-buddy.php"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Download size={15} /> Download abandonment-buddy.php
                  </a>
                  <p className="mt-2 text-xs text-slate-400">
                    Alternatively, upload the .php file via FTP to <code className="rounded bg-slate-100 px-1">wp-content/plugins/</code>
                  </p>
                </Step>

                <Step number={3} title="Configure the plugin" done={isConnected}>
                  <p className="mb-3">
                    In WordPress, go to <strong>WooCommerce → Abandonment Buddy</strong> and enter these values:
                  </p>
                  <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <CopyField label="API URL" value={API_BASE_URL} />
                    <CopyField label="Store ID" value={store.id} />
                    <CopyField label="API Key" value={store.apiKey ?? ''} secret />
                    <CopyField label="API Secret" value={store.apiSecret ?? ''} secret />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Click <strong>Save &amp; Connect</strong> in the plugin to authenticate.
                  </p>
                </Step>

                <Step number={4} title="Verify the connection" done={isConnected}>
                  <p className="mb-3">
                    After configuring the plugin, click below to confirm it&apos;s talking to Abandonment Buddy.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={connectStore}
                      disabled={connecting}
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
                    >
                      <PlugZap size={15} />
                      {connecting ? 'Connecting…' : 'Connect store'}
                    </button>
                    <button
                      onClick={checkHealth}
                      disabled={testing}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <RotateCw size={15} className={testing ? 'animate-spin' : ''} />
                      Test connection
                    </button>
                  </div>
                </Step>

                {/* Step 5 is final — no connector line needed */}
                <div className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isConnected ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {isConnected ? <CheckCircle2 size={16} /> : 5}
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <p className="mb-1 font-semibold text-slate-900">Cart tracking active</p>
                    <p className="text-sm text-slate-500">
                      {isConnected
                        ? 'Your store is live. Every cart update is tracked and will trigger recovery campaigns after the configured timeout.'
                        : 'Complete the steps above to start tracking abandoned carts.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: credentials + status ── */}
            <div className="space-y-4">

              {/* Connection status */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isConnected ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                    {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {isConnected ? 'Connected & tracking' : 'Not connected'}
                    </p>
                    <p className="text-xs text-slate-400">{store.domain}</p>
                  </div>
                </div>

                {health && (
                  <div className="mt-4 rounded-xl bg-slate-950 p-4">
                    <pre className="overflow-x-auto text-xs text-slate-100">
                      {JSON.stringify(health, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Webhook endpoints */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-900">Webhook endpoints</p>
                </div>
                <div className="space-y-3">
                  <CopyField label="Cart session (HMAC signed)" value={webhookCartUrl} />
                  <CopyField label="Order completed (HMAC signed)" value={webhookOrderUrl} />
                  <CopyField label="Health check" value={healthUrl} />
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  These are pre-configured inside the plugin. No manual entry needed.
                </p>
              </div>

              {/* Webhook secret */}
              {store.webhookSecret && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-500" />
                    <p className="text-sm font-semibold text-slate-900">Webhook secret</p>
                  </div>
                  <CopyField label="Used to sign all plugin requests" value={store.webhookSecret} secret />
                  <p className="mt-2 text-xs text-slate-400">
                    The plugin sets this automatically on connect. Keep it private.
                  </p>
                </div>
              )}

              {/* Help link */}
              <a
                href="https://abandonmentbuddy.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600"
              >
                <ExternalLink size={14} /> Read the integration docs
              </a>
            </div>

          </div>
        )}
      </div>
    </AppShell>
  );
}
