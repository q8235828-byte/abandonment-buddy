import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

const team = [
  {
    name: 'Alex Rivera',
    role: 'Co-founder & CEO',
    bio: 'Former WooCommerce store owner who lost thousands to cart abandonment before deciding to build the solution himself.',
    initials: 'AR',
    color: 'bg-teal-500',
  },
  {
    name: 'Priya Nair',
    role: 'Co-founder & CTO',
    bio: 'Ex-Shopify engineer with 10 years building e-commerce infrastructure. Obsessed with reliability and scale.',
    initials: 'PN',
    color: 'bg-violet-500',
  },
  {
    name: 'Jordan Blake',
    role: 'Head of Product',
    bio: 'Spent 7 years in conversion optimisation at a top agency. Knows exactly what makes shoppers come back.',
    initials: 'JB',
    color: 'bg-amber-500',
  },
  {
    name: 'Sara Müller',
    role: 'Head of Customer Success',
    bio: 'Onboarded 400+ stores personally. If there\'s a WooCommerce edge case, Sara has already solved it.',
    initials: 'SM',
    color: 'bg-rose-500',
  },
];

const milestones = [
  {
    year: '2022',
    label: 'Founded',
    desc: 'Started as an internal tool to save a failing fashion store from abandonment losses.',
  },
  {
    year: '2023',
    label: '100 stores',
    desc: 'Reached 100 paying customers purely through word-of-mouth in the WooCommerce community.',
  },
  {
    year: '2024',
    label: '$1M recovered',
    desc: 'Crossed the first million dollars recovered. Launched WhatsApp campaigns.',
  },
  {
    year: '2025',
    label: '500+ stores',
    desc: 'Launched SMS, the Business tier, and crossed $4M in total revenue recovered.',
  },
];

const values = [
  {
    icon: <Heart size={20} className="text-rose-500" />,
    bg: 'bg-rose-50',
    title: 'Store owners first',
    desc: 'Every decision starts with one question: does this help a store owner recover more revenue with less effort?',
  },
  {
    icon: <ShieldCheck size={20} className="text-teal-500" />,
    bg: 'bg-teal-50',
    title: 'Privacy by design',
    desc: 'GDPR compliance, transparent consent, and automatic unsubscribes are not afterthoughts — they\'re defaults.',
  },
  {
    icon: <Lightbulb size={20} className="text-amber-500" />,
    bg: 'bg-amber-50',
    title: 'Ruthless simplicity',
    desc: 'We constantly cut features that add friction and double down on what actually drives recovery results.',
  },
  {
    icon: <TrendingUp size={20} className="text-violet-500" />,
    bg: 'bg-violet-50',
    title: 'Measurable impact',
    desc: 'We show you the exact revenue recovered, down to the cent. No vanity metrics, no ambiguity.',
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white text-slate-950">
      <SiteHeader />

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 pb-20 pt-20 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(20,184,166,0.14),transparent)]" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
                Our story
              </p>
              <h1 className="mt-4 text-5xl font-black leading-[1.08] tracking-tight lg:text-6xl">
                We built the tool<br />
                <span className="text-teal-400">we wished existed.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
                Abandonment Buddy started when one of our founders — running his own WooCommerce
                store — realised he was losing thousands every month to abandoned carts with no
                simple, affordable fix. So he built one.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-400"
                >
                  Try it free <ArrowRight size={15} />
                </Link>
                <Link
                  href="/#pricing"
                  className="flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white"
                >
                  View pricing
                </Link>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
              {[
                { value: '$4.2M+', label: 'revenue recovered' },
                { value: '500+', label: 'active stores' },
                { value: '47%', label: 'avg recovery rate' },
                { value: '4.9 / 5', label: 'customer rating' },
              ].map((s) => (
                <div
                  key={s.value}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-center lg:w-44"
                >
                  <p className="text-2xl font-black text-teal-400">{s.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ──────────────────────────────────── */}
      <section className="border-b border-slate-100 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
                The problem
              </p>
              <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
                Good stores lose revenue every single day.
              </h2>
              <div className="mt-6 space-y-4 text-base leading-8 text-slate-600">
                <p>
                  Nearly 70% of online shopping carts are abandoned before checkout. For a store
                  doing $50,000 a month, that&apos;s potentially <strong className="text-slate-900">$115,000 in lost revenue</strong> — every month.
                </p>
                <p>
                  Existing tools were either enterprise-level software costing thousands per month,
                  unstable plugins, or email-only platforms that couldn&apos;t reach shoppers on the
                  channels they actually use.
                </p>
                <p>
                  We knew small and mid-sized store owners deserved something better — affordable,
                  genuinely multi-channel, and ready in under 5 minutes.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50">
              {[
                { value: '69.8%', label: 'of all online shopping carts abandoned before checkout' },
                { value: '$260B', label: 'in recoverable revenue lost industrywide every year' },
                { value: '3–5×', label: 'ROI achievable with a well-timed recovery sequence' },
                { value: '< 5 min', label: 'to connect your store and send your first recovery' },
              ].map((s) => (
                <div key={s.value} className="flex items-center gap-5 px-6 py-5">
                  <p className="w-24 shrink-0 text-2xl font-black text-teal-600">{s.value}</p>
                  <p className="text-sm leading-6 text-slate-600">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission quote ────────────────────────────────── */}
      <section className="bg-slate-950 py-24 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative">
            <span className="pointer-events-none absolute -left-2 -top-6 select-none text-[8rem] font-black leading-none text-white/[0.04]">
              &ldquo;
            </span>
            <p className="relative text-sm font-semibold uppercase tracking-widest text-teal-400">
              Our mission
            </p>
            <blockquote className="relative mt-5 text-2xl font-semibold leading-snug text-white sm:text-3xl lg:text-4xl">
              To make abandoned cart recovery accessible, affordable, and effective for every
              WooCommerce store owner —&nbsp;
              <span className="text-teal-400">not just enterprise businesses.</span>
            </blockquote>
            <div className="mt-8 flex items-center gap-4 border-t border-white/10 pt-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white">
                AR
              </div>
              <div>
                <p className="font-semibold text-white">Alex Rivera</p>
                <p className="text-sm text-slate-400">Co-founder &amp; CEO, Abandonment Buddy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────── */}
      <section className="border-b border-slate-100 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">Our values</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">What we stand for</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="flex gap-5">
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.bg}`}>
                  {v.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-slate-500">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────── */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">Our journey</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">From side project to 500+ stores</h2>
          </div>

          {/* Horizontal timeline */}
          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="absolute left-0 right-0 top-5 hidden h-px bg-slate-200 sm:block" />

            <div className="grid gap-8 sm:grid-cols-4">
              {milestones.map((m, i) => (
                <div key={m.year} className="relative">
                  {/* Node */}
                  <div className="relative z-10 mb-5 flex items-center gap-3 sm:block">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-teal-500 text-xs font-bold text-white shadow-md sm:mb-4">
                      {i + 1}
                    </div>
                    <p className="text-2xl font-black text-teal-600 sm:hidden">{m.year}</p>
                  </div>
                  <p className="hidden text-2xl font-black text-teal-600 sm:block">{m.year}</p>
                  <p className="mt-1 font-semibold text-slate-900">{m.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">The team</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">Built by people who get e-commerce</h2>
            <p className="mt-4 max-w-xl text-base text-slate-500">
              We&apos;ve run stores, built payment systems, and optimised thousands of checkout funnels.
              We know this problem because we&apos;ve lived it.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <div
                key={member.name}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white ${member.color}`}>
                  {member.initials}
                </div>
                <p className="font-semibold text-slate-900">{member.name}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-teal-600">
                  {member.role}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-500">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why us ───────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
                Why choose us
              </p>
              <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
                We don&apos;t just recover carts.<br />We build trust with shoppers.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                The best recovery isn&apos;t aggressive — it&apos;s helpful. Our sequences are designed to
                remind, not harass, so shoppers feel good about coming back.
              </p>
              <ul className="mt-7 space-y-3.5">
                {[
                  'Intelligent timing — no spam, no over-messaging',
                  'Personalised messages using real cart contents',
                  'One-click unsubscribe always visible',
                  'GDPR & CAN-SPAM compliant out of the box',
                  'Support from humans who know WooCommerce',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-teal-500" />
                    <span className="text-sm leading-6 text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                By the numbers
              </p>
              <p className="mb-7 text-sm text-slate-500">Across 500+ stores · last 12 months</p>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                {[
                  { value: '$4.2M+', label: 'revenue recovered' },
                  { value: '47%', label: 'avg recovery rate' },
                  { value: '2 min', label: 'avg setup time' },
                  { value: '98.7%', label: 'email delivery rate' },
                  { value: '500+', label: 'active stores' },
                  { value: '4.9 / 5', label: 'customer satisfaction' },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col bg-white px-5 py-4">
                    <p className="text-2xl font-black text-teal-600">{s.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="bg-slate-950 py-24 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(20,184,166,0.1),transparent)]" />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-4xl font-black leading-tight tracking-tight lg:text-5xl">
            Ready to stop leaving<br />money on the table?
          </h2>
          <p className="mt-5 text-base text-slate-400">
            Set up in under 5 minutes. Free plan forever. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
            >
              Get started for free <ArrowRight size={16} />
            </Link>
            <Link
              href="/#pricing"
              className="flex items-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-sm font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white"
            >
              View pricing
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
