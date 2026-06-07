import Link from 'next/link';
import { LockKeyhole, ShoppingCart } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold text-slate-950">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
                <ShoppingCart size={16} />
              </div>
              Abandonment Buddy
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
              Automated abandoned cart recovery for WooCommerce stores. Recover more revenue, effortlessly.
            </p>
            <div className="mt-5 flex gap-3">
              {['Twitter', 'LinkedIn', 'GitHub'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-800"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {[
            {
              heading: 'Product',
              links: [
                { label: 'Features', href: '/#features' },
                { label: 'Pricing', href: '/#pricing' },
                { label: 'Integrations', href: '#' },
                { label: 'Changelog', href: '#' },
              ],
            },
            {
              heading: 'Company',
              links: [
                { label: 'About', href: '/about' },
                { label: 'Blog', href: '#' },
                { label: 'Careers', href: '#' },
                { label: 'Contact', href: '#' },
              ],
            },
            {
              heading: 'Legal',
              links: [
                { label: 'Privacy Policy', href: '#' },
                { label: 'Terms of Service', href: '#' },
                { label: 'Cookie Policy', href: '#' },
                { label: 'GDPR', href: '#' },
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {col.heading}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-slate-950"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Abandonment Buddy. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <LockKeyhole size={12} className="text-slate-400" />
            <p className="text-xs text-slate-400">SOC 2 &amp; GDPR compliant</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
