import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bitcoin,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Plug,
  Shield,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';

function AppMockup() {
  const bars = [38, 52, 44, 68, 58, 82, 70, 92, 78, 96, 86, 100];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/[0.12]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="mx-3 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-400">
          app.abandonmentbuddy.com/dashboard
        </div>
      </div>

      <div className="flex min-h-0">
        {/* Sidebar */}
        <div className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-slate-100 py-5 sm:flex">
          {[
            { Icon: BarChart3, active: true },
            { Icon: Mail, active: false },
            { Icon: MessageSquare, active: false },
            { Icon: Plug, active: false },
          ].map(({ Icon, active }, i) => (
            <div
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                active ? 'bg-teal-500 text-white' : 'text-slate-400'
              }`}
            >
              <Icon size={16} />
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Recovery Overview</p>
              <p className="text-xs text-slate-400">June 2025 · All stores</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-600">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Live
            </span>
          </div>

          {/* KPI row */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Revenue Recovered', value: '$3,240', delta: '+12%' },
              { label: 'Carts Recovered', value: '148', delta: '+8%' },
              { label: 'Recovery Rate', value: '47%', delta: '+3%' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{s.value}</p>
                <p className="mt-0.5 text-xs font-semibold text-teal-600">{s.delta} this week</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-medium text-slate-500">Revenue recovered — last 12 days</p>
            <div className="flex h-16 items-end gap-1">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-teal-500"
                  style={{ height: `${h}%`, opacity: 0.35 + (i / bars.length) * 0.65 }}
                />
              ))}
            </div>
          </div>

          {/* Recoveries */}
          <div className="space-y-1.5">
            {[
              { name: 'Sarah K.', amount: '$89.00', ch: 'Email', time: '2m ago' },
              { name: 'Mark T.', amount: '$234.50', ch: 'WhatsApp', time: '8m ago' },
              { name: 'Jenny L.', amount: '$67.00', ch: 'SMS', time: '15m ago' },
            ].map((r) => (
              <div key={r.name} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                  {r.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.time}</p>
                </div>
                <span className="text-xs font-bold text-teal-600">{r.amount}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{r.ch}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-white text-slate-950">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 pb-0 pt-20 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(20,184,166,0.15),transparent)]" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          {/* Social proof */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['#0d9488', '#0891b2', '#7c3aed', '#b45309', '#be123c'].map((bg, i) => (
                <div
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 text-xs font-bold text-white"
                  style={{ background: bg }}
                >
                  {['S', 'J', 'M', 'E', 'R'][i]}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-sm text-slate-400">
              <span className="font-semibold text-white">4.9</span> from 500+ stores
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Stop losing revenue to<br />
            <span className="text-teal-400">abandoned WooCommerce carts.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Automatically follow up with lost shoppers via email, WhatsApp, and SMS.
            Most stores recover <span className="font-semibold text-slate-200">47% of abandoned carts</span> within 72 hours.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-400"
            >
              Start recovering — it&apos;s free <ArrowRight size={16} />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white"
            >
              See how it works
            </a>
          </div>

          {/* Trust line */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-5">
            {['Free forever plan', 'No credit card needed', 'Setup in 2 minutes'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 size={13} className="text-teal-500" />
                {t}
              </span>
            ))}
          </div>

          {/* App mockup — sits flush at the bottom of the dark section */}
          <div className="relative mx-auto mt-14 max-w-3xl">
            <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(20,184,166,0.12),transparent_70%)]" />
            <div className="relative">
              <AppMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Logos ────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
            Works with your existing stack
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {['WooCommerce', 'WordPress', 'Mailchimp', 'Twilio', 'Stripe', 'Klaviyo'].map((n) => (
              <span key={n} className="text-sm font-semibold text-slate-300">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { value: '69.8%', label: 'of all online carts are abandoned before checkout' },
              { value: '3×', label: 'more revenue when you follow up within the first hour' },
              { value: '47%', label: 'average recovery rate for stores using Abandonment Buddy' },
            ].map((s) => (
              <div key={s.value} className="px-8 py-8 text-center first:pl-0 last:pr-0 sm:py-0">
                <p className="text-5xl font-black text-teal-500">{s.value}</p>
                <p className="mx-auto mt-3 max-w-[180px] text-sm leading-6 text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section id="features" className="border-t border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-16 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">Features</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">Everything you need to win shoppers back</h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              From the moment a cart is abandoned to the moment the sale is recovered — every step is handled automatically.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Zap size={20} />,
                title: 'Real-time Detection',
                desc: 'Detect abandoned carts the moment a shopper leaves — no delays, no missed windows.',
              },
              {
                icon: <Mail size={20} />,
                title: 'Multi-channel Campaigns',
                desc: 'Email, WhatsApp, and SMS recovery sequences. Reach shoppers where they actually are.',
              },
              {
                icon: <Clock size={20} />,
                title: 'Smart Timing',
                desc: 'Automatically send at 1h, 24h, and 72h — the three windows proven to recover the most carts.',
              },
              {
                icon: <BarChart3 size={20} />,
                title: 'Revenue Analytics',
                desc: 'See recovered revenue, best-performing channels, and ROI — all in one clean dashboard.',
              },
              {
                icon: <MessageSquare size={20} />,
                title: 'Customisable Templates',
                desc: 'Use our proven templates or write your own. A/B test subject lines and message copy.',
              },
              {
                icon: <Shield size={20} />,
                title: 'GDPR Compliant',
                desc: 'Auto-unsubscribe, consent tracking, and full data controls built in from day one.',
              },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">How it works</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">Live in under 5 minutes</h2>
            <p className="mx-auto mt-4 max-w-md text-base text-slate-500">
              No developers, no plugins. Connect your store and your first recovery sequence starts immediately.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Connect your store',
                desc: 'Enter your WooCommerce URL and API key. We start watching for abandoned carts immediately.',
                icon: <Plug size={22} />,
              },
              {
                step: '2',
                title: 'Configure campaigns',
                desc: 'Pick your channels, customise your message templates, and set your recovery timing.',
                icon: <Mail size={22} />,
              },
              {
                step: '3',
                title: 'Watch revenue return',
                desc: 'Shoppers get followed up automatically. Revenue appears in your dashboard in real time.',
                icon: <TrendingUp size={22} />,
              },
            ].map((s, i) => (
              <div key={s.step} className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white">
                    {s.icon}
                  </div>
                  {i < 2 && (
                    <div className="hidden sm:block absolute -right-3 top-1/2 z-10 -translate-y-1/2">
                      <ArrowRight size={16} className="text-slate-300" />
                    </div>
                  )}
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal-600">Step {s.step}</p>
                <h3 className="mb-2 font-semibold text-slate-900">{s.title}</h3>
                <p className="text-sm leading-6 text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <section id="pricing" className="border-t border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">Pricing</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-4 text-base text-slate-500">Start free. Upgrade with crypto. No hidden fees.</p>
          </div>

          {/* Crypto payment badge */}
          <div className="mb-12 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
              <Bitcoin size={13} className="text-amber-500" />
              Paid plans accept Bitcoin, USDT, Ethereum & 100+ cryptocurrencies via NOWPayments
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                name: 'Free',
                price: '$0',
                sub: 'forever',
                desc: 'Get started with basic cart recovery',
                highlight: false,
                badge: null,
                color: 'teal',
                limits: [
                  { icon: <ShoppingBag size={13} />, text: '100 orders / month' },
                  { icon: <Mail size={13} />,        text: '50 emails / month' },
                  { icon: <Smartphone size={13} />,  text: '20 SMS / month' },
                  { icon: <MessageSquare size={13} />,text: '20 WhatsApp / month' },
                ],
                features: [
                  'WooCommerce integration',
                  'Email recovery campaigns',
                  'Basic analytics dashboard',
                  'Custom message templates',
                  'Community support',
                ],
                cta: 'Get started free',
                href: '/signup',
              },
              {
                name: 'Starter',
                price: '$20',
                sub: '/ month',
                desc: 'For growing stores with more cart traffic',
                highlight: true,
                badge: 'Most popular',
                color: 'teal',
                limits: [
                  { icon: <ShoppingBag size={13} />, text: '1,000 orders / month' },
                  { icon: <Mail size={13} />,        text: '500 emails / month' },
                  { icon: <Smartphone size={13} />,  text: '200 SMS / month' },
                  { icon: <MessageSquare size={13} />,text: '200 WhatsApp / month' },
                ],
                features: [
                  'Everything in Free',
                  'Email + WhatsApp + SMS',
                  'Campaign scheduling',
                  'Advanced analytics',
                  'Priority support',
                ],
                cta: 'Upgrade to Starter',
                href: '/signup',
              },
              {
                name: 'Pro',
                price: '$50',
                sub: '/ month',
                desc: 'Unlimited recovery for high-volume stores',
                highlight: false,
                badge: null,
                color: 'violet',
                limits: [
                  { icon: <ShoppingBag size={13} />, text: 'Unlimited orders' },
                  { icon: <Mail size={13} />,        text: 'Unlimited emails' },
                  { icon: <Smartphone size={13} />,  text: 'Unlimited SMS' },
                  { icon: <MessageSquare size={13} />,text: 'Unlimited WhatsApp' },
                ],
                features: [
                  'Everything in Starter',
                  'Unlimited everything',
                  'Multi-store management',
                  'Advanced analytics',
                  'Dedicated support',
                ],
                cta: 'Upgrade to Pro',
                href: '/signup',
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border-2 p-8 ${
                  plan.highlight
                    ? 'border-teal-500 bg-slate-950 text-white shadow-xl shadow-teal-500/10'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-4 py-1 text-xs font-bold text-white">
                      <Sparkles size={10} /> {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <p className={`text-xs font-bold uppercase tracking-widest ${plan.highlight ? 'text-teal-400' : plan.color === 'violet' ? 'text-violet-600' : 'text-teal-600'}`}>
                    {plan.name}
                  </p>
                  <div className="mt-2 flex items-end gap-1.5">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className={`mb-1 text-sm ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>{plan.sub}</span>
                  </div>
                  <p className={`mt-1.5 text-sm ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>{plan.desc}</p>
                </div>

                {/* Usage limits grid */}
                <div className="mb-5 grid grid-cols-2 gap-2">
                  {plan.limits.map((l) => (
                    <div key={l.text} className={`rounded-lg px-3 py-2 ${plan.highlight ? 'bg-white/10' : 'bg-slate-50'}`}>
                      <div className={`flex items-center gap-1 text-xs mb-0.5 ${plan.highlight ? 'text-slate-400' : 'text-slate-400'}`}>{l.icon}</div>
                      <p className={`text-xs font-semibold ${plan.highlight ? 'text-slate-200' : 'text-slate-700'}`}>{l.text}</p>
                    </div>
                  ))}
                </div>

                <ul className="mb-8 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-teal-400' : plan.color === 'violet' ? 'text-violet-500' : 'text-teal-500'}`} />
                      <span className={`text-sm ${plan.highlight ? 'text-slate-300' : 'text-slate-600'}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors ${
                    plan.highlight
                      ? 'bg-teal-500 text-white hover:bg-teal-400'
                      : plan.color === 'violet'
                        ? 'bg-violet-600 text-white hover:bg-violet-500'
                        : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  {plan.cta} <ArrowRight size={14} />
                </Link>

                {plan.price !== '$0' && (
                  <p className={`mt-3 text-center text-xs ${plan.highlight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Pay with crypto · Instant activation
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Comparison footnote */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3 text-center">
            {[
              { icon: <Bitcoin size={14} className="text-amber-500" />, text: 'Bitcoin, USDT, ETH & 100+ coins accepted' },
              { icon: <Zap size={14} className="text-teal-500" />,     text: 'Plan activates instantly on payment confirmation' },
              { icon: <Shield size={14} className="text-slate-500" />, text: 'Cancel any time · No contracts' },
            ].map((n) => (
              <div key={n.text} className="flex items-center justify-center gap-2 text-xs text-slate-500">
                {n.icon} {n.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section id="testimonials" className="py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">Testimonials</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">Real stores, real results</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote: 'We recovered $12,000 in our very first month. The WhatsApp sequences convert way better than email alone.',
                name: 'Sarah Mitchell',
                role: 'Owner, Bloom Fashion',
                stat: '$12k in month 1',
              },
              {
                quote: 'Setup took under 5 minutes. Now it runs in the background and money comes in. Best ROI tool in my stack.',
                name: 'James Kowalski',
                role: 'Founder, TechGadgets Direct',
                stat: '$8.4k / month',
              },
              {
                quote: 'I can see exactly which message in the sequence is converting and optimise accordingly. The analytics are great.',
                name: 'Maria Lopes',
                role: 'E-commerce Manager, HomeNest',
                stat: '51% recovery rate',
              },
              {
                quote: 'We run 6 WooCommerce stores and manage them all from one dashboard. Saves us hours every single week.',
                name: 'David Chen',
                role: 'Director, CartFlow Agency',
                stat: '6 stores, one view',
              },
              {
                quote: 'Switched from a competitor and immediately saw a 20% improvement. The timing logic is just smarter here.',
                name: 'Emma Thompson',
                role: 'Head of Growth, Outdoors & More',
                stat: '+20% recovery lift',
              },
              {
                quote: 'GDPR compliance was our main concern. Abandonment Buddy handles consent and unsubscribes automatically.',
                name: 'Lukas Weber',
                role: 'CTO, EuroShop GmbH',
                stat: 'EU compliant',
              },
            ].map((t) => (
              <div key={t.name} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-7 text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                    {t.stat}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-950 py-24 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(20,184,166,0.1),transparent)]" />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-4xl font-black leading-tight tracking-tight lg:text-5xl">
            Your abandoned carts are<br />waiting to come back.
          </h2>
          <p className="mt-5 text-base text-slate-400">
            Join 500+ WooCommerce stores already recovering revenue on autopilot.
            Free plan forever — no credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
            >
              Get started for free <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-sm font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white"
            >
              Sign in to dashboard
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-600">
            Free forever &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Cancel anytime
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
