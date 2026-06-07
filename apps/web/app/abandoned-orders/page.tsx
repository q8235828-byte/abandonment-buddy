'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DollarSign,
  PackageSearch,
  RefreshCcw,
  Search,
  ShoppingBag,
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
import type { AbandonedOrder } from '../lib/types';

const statusOptions = [
  'ALL',
  'DETECTED',
  'RECOVERED',
  'EXPIRED',
];

export default function AbandonedOrdersPage() {
  const [orders, setOrders] =
    useState<AbandonedOrder[]>([]);
  const [statusFilter, setStatusFilter] =
    useState('ALL');
  const [query, setQuery] =
    useState('');
  const [loading, setLoading] =
    useState(true);
  const [checking, setChecking] =
    useState(false);
  const [error, setError] =
    useState('');
  const [message, setMessage] =
    useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');

      const response =
        await api.get<AbandonedOrder[]>(
          '/abandonment/orders',
        );

      setOrders(response.data);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Failed to load orders',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const search =
      query.toLowerCase().trim();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        order.status === statusFilter;

      const matchesSearch =
        !search ||
        [
          order.externalOrderId,
          order.customerName,
          order.customerEmail,
          order.customerPhone,
          order.store?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [orders, query, statusFilter]);

  const totals = useMemo(() => {
    const detected =
      orders.filter(
        (order) =>
          order.status === 'DETECTED',
      ).length;
    const recovered =
      orders.filter(
        (order) =>
          order.status === 'RECOVERED',
      );
    const revenue =
      recovered.reduce(
        (sum, order) =>
          sum +
          Number(order.cartValue || 0),
        0,
      );

    return {
      detected,
      recovered: recovered.length,
      revenue,
    };
  }, [orders]);

  const runAbandonmentCheck = async () => {
    try {
      setChecking(true);
      setMessage('');
      setError('');

      const response =
        await api.post(
          '/abandonment/check',
        );

      setMessage(
        `Detection complete: ${response.data.abandoned} new abandoned carts found.`,
      );

      await fetchOrders();
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Failed to run detection',
        ),
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppShell
      title="Abandoned orders"
      subtitle="Search, filter, and triage carts waiting for recovery."
      action={
        <button
          onClick={runAbandonmentCheck}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <RefreshCcw
            size={16}
            className={checking ? 'animate-spin' : ''}
          />
          {checking
            ? 'Checking'
            : 'Run detection'}
        </button>
      }
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
            label="Tracked orders"
            value={orders.length}
            helper="All webhook orders"
            icon={<ShoppingBag size={19} />}
          />
          <StatCard
            label="Detected carts"
            value={totals.detected}
            helper="Awaiting recovery"
            icon={<PackageSearch size={19} />}
          />
          <StatCard
            label="Recovered revenue"
            value={`$${totals.revenue.toFixed(2)}`}
            helper={`${totals.recovered} recovered orders`}
            icon={<DollarSign size={19} />}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-base font-semibold">
                Order queue
              </h2>
              <p className="text-sm text-slate-500">
                Filter by recovery state or customer details.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(e) =>
                    setQuery(e.target.value)
                  }
                  placeholder="Search orders"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm sm:w-72"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value,
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              >
                {statusOptions.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status === 'ALL'
                      ? 'All statuses'
                      : status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-5">
              <LoadingRow label="Loading orders..." />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No matching orders"
                description="Try a different search or run detection after webhook orders arrive."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">
                      Order
                    </th>
                    <th className="px-5 py-3 text-left font-semibold">
                      Customer
                    </th>
                    <th className="px-5 py-3 text-left font-semibold">
                      Store
                    </th>
                    <th className="px-5 py-3 text-left font-semibold">
                      Cart value
                    </th>
                    <th className="px-5 py-3 text-left font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-semibold text-slate-950">
                          {order.externalOrderId}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Woo status:{' '}
                          {order.orderStatus ||
                            'unknown'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-950">
                          {order.customerName ||
                            'Unknown customer'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {order.customerEmail ||
                            'No email'}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {order.store?.name ||
                          'Store'}
                      </td>
                      <td className="px-5 py-4 font-medium">
                        $
                        {Number(
                          order.cartValue || 0,
                        ).toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={order.status}
                        />
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
