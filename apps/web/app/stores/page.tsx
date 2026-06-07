'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Layers, Plus, Search, Store as StoreIcon, XCircle } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Alert, EmptyState, LoadingRow, StatCard, StatusBadge } from '../components/Ui';
import { api, getApiErrorMessage } from '../lib/api';
import type { Store } from '../lib/types';

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition';

export default function StoresPage() {
  const [stores, setStores]   = useState<Store[]>([]);
  const [name, setName]       = useState('');
  const [domain, setDomain]   = useState('');
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [message, setMessage] = useState('');

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get<Store[]>('/stores');
      setStores(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load stores'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchStores(); }, []);

  const createStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !domain.trim()) { setError('Store name and domain are required.'); return; }
    try {
      setSaving(true); setError(''); setMessage('');
      await api.post('/stores', { name: name.trim(), domain: domain.trim() });
      setName(''); setDomain('');
      setMessage('Store created. Open Manage to copy credentials and test the webhook.');
      await fetchStores();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create store'));
    } finally {
      setSaving(false);
    }
  };

  const filteredStores = useMemo(() => {
    const q = query.toLowerCase().trim();
    return !q ? stores : stores.filter((s) => `${s.name} ${s.domain} ${s.status}`.toLowerCase().includes(q));
  }, [query, stores]);

  const connectedCount = useMemo(() => stores.filter((s) => s.status === 'CONNECTED').length, [stores]);

  return (
    <AppShell title="Stores" subtitle="Create store credentials and monitor WooCommerce connection status.">
      <div className="space-y-6">
        {error   && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}

        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total stores"  value={stores.length}              helper="Stores in this workspace"  icon={<Layers size={18} />}       color="slate" />
          <StatCard label="Connected"     value={connectedCount}             helper="Ready for webhooks"        icon={<CheckCircle2 size={18} />} color="teal" />
          <StatCard label="Disconnected"  value={stores.length - connectedCount} helper="Need credential setup" icon={<XCircle size={18} />}      color="amber" />
        </section>

        {/* Add store */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">Add store</h2>
            <p className="mt-1 text-sm text-slate-500">Creates the API credentials your WooCommerce plugin will use.</p>
          </div>
          <form onSubmit={createStore} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input type="text" placeholder="Store name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            <input type="text" placeholder="store.com" value={domain} onChange={(e) => setDomain(e.target.value)} className={inputCls} />
            <button type="submit" disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition">
              <Plus size={16} />
              {saving ? 'Adding…' : 'Add store'}
            </button>
          </form>
        </section>

        {/* Store list */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Store list</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage credentials, webhook URLs, and email settings.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stores"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition" />
            </div>
          </div>

          {loading ? (
            <div className="p-6"><LoadingRow label="Loading stores…" /></div>
          ) : filteredStores.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No stores found" description="Add a WooCommerce store to generate credentials and start tracking carts." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3">Store</th>
                    <th className="px-6 py-3">Timeout</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStores.map((store) => (
                    <tr key={store.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <StoreIcon size={14} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{store.name}</p>
                            <p className="text-xs text-slate-400">{store.domain}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{store.abandonmentTimeoutMin} min</td>
                      <td className="px-6 py-4"><StatusBadge status={store.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/stores/${store.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-950 hover:text-white hover:border-slate-950 transition">
                          Manage <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
