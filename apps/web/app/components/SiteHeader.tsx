'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, ShoppingCart, X } from 'lucide-react';

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-950">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
            <ShoppingCart size={16} />
          </div>
          Abandonment Buddy
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="/#features" className="text-sm text-slate-600 transition-colors hover:text-slate-950">Features</a>
          <a href="/#how-it-works" className="text-sm text-slate-600 transition-colors hover:text-slate-950">How it works</a>
          <a href="/#pricing" className="text-sm text-slate-600 transition-colors hover:text-slate-950">Pricing</a>
          <Link href="/about" className="text-sm text-slate-600 transition-colors hover:text-slate-950">About</Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Get started <ArrowRight size={14} />
          </Link>
        </div>

        <button
          className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-3">
            {[
              { label: 'Features', href: '/#features' },
              { label: 'How it works', href: '/#how-it-works' },
              { label: 'Pricing', href: '/#pricing' },
              { label: 'About', href: '/about' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3">
            <Link href="/login" className="rounded-lg px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-100">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
