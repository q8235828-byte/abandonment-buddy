'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowRight,
  Plus,
  Search,
  Store as StoreIcon,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import {
  Alert,
  EmptyState,
  LoadingRow,
  StatCard,
  StatusBadge,
} from '../components/Ui';
import {
  api,
  getApiErrorMessage,
} from '../lib/api';
import type { Store } from '../lib/types';

export default function StoresPage() {
  const [stores, setStores] =
    useState<Store[]>([]);
  const [name, setName] =
    useState('');
  const [domain, setDomain] =
    useState('');
  const [query, setQuery] =
    useState('');
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState('');
  const [message, setMessage] =
    useState('');

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');

      const response =
        await api.get<Store[]>('/stores');

      setStores(response.data);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Failed to load stores',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStores();
  }, []);

  const createStore = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (!name.trim() || !domain.trim()) {
      setError(
        'Store name and domain are required.',
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      await api.post('/stores', {
        name: name.trim(),
        domain: domain.trim(),
      });

      setName('');
      setDomain('');
      setMessage(
        'Store created. Open Manage to copy credentials and test the webhook.',
      );

      await fetchStores();
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Failed to create store',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredStores = useMemo(() => {
    const normalized =
      query.toLowerCase().trim();

    if (!normalized) {
      return stores;
    }

    return stores.filter((store) =>
      `${store.name} ${store.domain} ${store.status}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, stores]);

  const connectedCount = useMemo(
    () =>
      stores.filter(
        (store) =>
          store.status === 'CONNECTED',
      ).length,
    [stores],
  );

  return (
    <AppShell
      title="Stores"
      subtitle="Create store credentials and monitor WooCommerce connection status."
    >
      <div className="space-y-6">
        {error && (
          <Alert type="error">
            {error}
          </Alert>
        )}
        {message && (
          <Alert type="success">
            {message}
          </Alert>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total stores"
            value={stores.length}
            helper="Stores in this workspace"
            icon={<StoreIcon size={19} />}
          />
          <StatCard
            label="Connected"
            value={connectedCount}
            helper="Ready for webhooks"
            icon={<StoreIcon size={19} />}
          />
          <StatCard
            label="Disconnected"
            value={
              stores.length -
              connectedCount
            }
            helper="Need credential setup"
            icon={<StoreIcon size={19} />}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold">
              Add store
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This creates the API credentials your WooCommerce plugin will use.
            </p>
          </div>

          <form
            onSubmit={createStore}
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <input
              type="text"
              placeholder="Store name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm"
            />
            <input
              type="text"
              placeholder="https://store.com"
              value={domain}
              onChange={(e) =>
                setDomain(e.target.value)
              }
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={16} />
              {saving
                ? 'Adding'
                : 'Add store'}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">
                Store list
              </h2>
              <p className="text-sm text-slate-500">
                Manage credentials, connection tests, and webhook URLs.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder="Search stores"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-5">
              <LoadingRow label="Loading stores..." />
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No stores found"
                description="Add a WooCommerce store to generate credentials and start tracking carts."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">
                      Store
                    </th>
                    <th className="px-5 py-3 text-left font-semibold">
                      Timeout
                    </th>
                    <th className="px-5 py-3 text-left font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStores.map((store) => (
                    <tr
                      key={store.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-950">
                          {store.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {store.domain}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {store.abandonmentTimeoutMin} min
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={store.status}
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/stores/${store.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Manage
                          <ArrowRight size={15} />
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
