import {
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react';
import { ReactNode } from 'react';

const statColors = {
  teal: {
    icon: 'bg-teal-50 text-teal-600',
    value: 'text-teal-600',
    border: 'border-b-2 border-teal-500',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600',
    value: 'text-amber-600',
    border: 'border-b-2 border-amber-400',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-600',
    value: 'text-violet-600',
    border: 'border-b-2 border-violet-400',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-600',
    value: 'text-slate-950',
    border: 'border-b-2 border-slate-300',
  },
};

export function StatCard({
  label,
  value,
  helper,
  icon,
  color = 'slate',
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  icon: ReactNode;
  color?: keyof typeof statColors;
}) {
  const c = statColors[color];
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${c.border}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.icon}`}>
            {icon}
          </div>
        </div>
        <div className={`mt-3 text-3xl font-bold tracking-tight ${c.value}`}>
          {value}
        </div>
        {helper && (
          <p className="mt-2 text-xs text-slate-400">{helper}</p>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const isGood = status === 'CONNECTED' || status === 'RECOVERED';
  const isMuted = status === 'EXPIRED' || status === 'DISCONNECTED';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isGood
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : isMuted
            ? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isGood ? 'bg-emerald-500' : isMuted ? 'bg-slate-400' : 'bg-amber-500'}`} />
      {status}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({
  type,
  children,
}: {
  type: 'success' | 'error';
  children: ReactNode;
}) {
  const Icon = type === 'success' ? CheckCircle2 : XCircle;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        type === 'success'
          ? 'border-teal-200 bg-teal-50 text-teal-700'
          : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      <Icon size={17} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function LoadingRow({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-8 text-sm text-slate-400">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}
