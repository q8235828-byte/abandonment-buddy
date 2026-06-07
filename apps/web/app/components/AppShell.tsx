'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  LogOut,
  Mail,
  FileText,
  Menu,
  PackageSearch,
  Settings,
  Store as StoreIcon,
  X,
} from 'lucide-react';
import {
  ReactNode,
  useEffect,
  useState,
} from 'react';
import type { User } from '../lib/types';

const navItems = [
  { href: '/dashboard',       label: 'Dashboard', icon: BarChart3 },
  { href: '/stores',          label: 'Stores',    icon: StoreIcon },
  { href: '/abandoned-orders',label: 'Orders',    icon: PackageSearch },
  { href: '/campaigns',       label: 'Campaigns', icon: Mail },
  { href: '/templates',       label: 'Templates', icon: FileText },
  { href: '/settings',        label: 'Settings',  icon: Settings },
];

type AppShellProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] =
    useState(false);
  const [user, setUser] =
    useState<User | null>(null);

  useEffect(() => {
    const rawUser =
      localStorage.getItem('user');

    if (!rawUser) {
      return;
    }

    try {
      setUser(JSON.parse(rawUser));
    } catch {
      setUser(null);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <SidebarContent
          pathname={pathname}
          onLogout={logout}
          user={user}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/30"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-80 max-w-[86vw] border-r border-slate-200 bg-white">
            <SidebarContent
              pathname={pathname}
              onLogout={logout}
              user={user}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={18} />
              </button>

              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {action}
              <button
                className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 sm:inline-flex"
                aria-label="Notifications"
              >
                <Bell size={17} />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  onLogout,
  user,
  onClose,
}: {
  pathname: string;
  onLogout: () => void;
  user: User | null;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Settings size={20} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">
              Abandonment Buddy
            </p>
            <p className="text-xs text-slate-500">
              Recovery operations
            </p>
          </div>
        </Link>

        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 lg:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            pathname.startsWith(
              `${item.href}/`,
            );

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <Link
          href="/profile"
          onClick={onClose}
          className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
            {(user?.fullName ?? user?.email ?? 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-950 truncate">
              {user?.fullName || user?.email || 'Store operator'}
            </p>
            <p className="truncate text-xs text-slate-500">
              {user?.email || 'Signed in locally'}
            </p>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}
