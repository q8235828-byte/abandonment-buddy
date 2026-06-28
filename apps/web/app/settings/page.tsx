'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Save,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { api, getApiErrorMessage } from '../lib/api';

type Tab = 'email' | 'sms' | 'whatsapp';

type Settings = {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpFrom?: string | null;
  smtpSecure?: boolean | null;
  smtpVerified?: boolean | null;
  twilioAccountSid?: string | null;
  twilioFromPhone?: string | null;
  twilioWhatsappNum?: string | null;
};

const PROVIDERS: Record<string, { host: string; port: number; secure: boolean; label: string }> = {
  gmail:   { host: 'smtp.gmail.com',     port: 587, secure: false, label: 'Gmail' },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false, label: 'Outlook / Hotmail' },
  yahoo:   { host: 'smtp.mail.yahoo.com',port: 587, secure: false, label: 'Yahoo Mail' },
  custom:  { host: '',                   port: 587, secure: false, label: 'Custom SMTP' },
};

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
        active ? 'bg-slate-950 text-white shadow' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition';

function StatusBar({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium mb-5 ${
      type === 'success' ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-rose-200 bg-rose-50 text-rose-700'
    }`}>
      {type === 'success' ? <CheckCircle2 size={14} /> : '❌'}
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('email');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Email
  const [emailProvider, setEmailProvider] = useState('gmail');
  const [smtpUser, setSmtpUser]   = useState('');
  const [smtpPass, setSmtpPass]   = useState('');
  const [smtpFrom, setSmtpFrom]   = useState('');
  const [smtpHost, setSmtpHost]   = useState('');
  const [smtpPort, setSmtpPort]   = useState('587');
  const [smtpVerified, setSmtpVerified] = useState(false);

  // SMS / WhatsApp
  const [twilioSid,  setTwilioSid]  = useState('');
  const [twilioAuth, setTwilioAuth] = useState('');
  const [twilioFrom, setTwilioFrom] = useState('');
  const [twilioWa,   setTwilioWa]   = useState('');

  useEffect(() => {
    api.get<Settings>('/auth/settings')
      .then(({ data }) => {
        if (data.smtpUser)     setSmtpUser(data.smtpUser);
        if (data.smtpFrom)     setSmtpFrom(data.smtpFrom);
        if (data.smtpHost)     setSmtpHost(data.smtpHost);
        if (data.smtpPort)     setSmtpPort(String(data.smtpPort));
        if (data.smtpVerified) setSmtpVerified(true);
        if (data.twilioAccountSid)  setTwilioSid(data.twilioAccountSid);
        if (data.twilioFromPhone)   setTwilioFrom(data.twilioFromPhone);
        if (data.twilioWhatsappNum) setTwilioWa(data.twilioWhatsappNum);

        // Detect provider
        if (data.smtpHost?.includes('gmail'))        setEmailProvider('gmail');
        else if (data.smtpHost?.includes('office365') || data.smtpHost?.includes('outlook')) setEmailProvider('outlook');
        else if (data.smtpHost?.includes('yahoo'))   setEmailProvider('yahoo');
        else if (data.smtpHost)                      setEmailProvider('custom');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setStatus(null);
    try {
      const res = await api.post<{ sentTo: string }>('/auth/test-email', { to: testTo || undefined });
      setStatus({ type: 'success', msg: `Test email sent to ${res.data.sentTo} — check your inbox.` });
    } catch (err) {
      setStatus({ type: 'error', msg: getApiErrorMessage(err, 'Failed to send test email') });
    } finally {
      setTesting(false);
    }
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const p = PROVIDERS[emailProvider];
      const payload: any = {
        smtpHost:   emailProvider === 'custom' ? smtpHost : p.host,
        smtpPort:   emailProvider === 'custom' ? smtpPort : p.port,
        smtpSecure: p.secure,
        smtpUser,
        smtpFrom:   smtpFrom || smtpUser,
      };
      if (smtpPass) payload.smtpPass = smtpPass;
      await api.patch('/auth/settings', payload);
      setSmtpVerified(false);
      setStatus({ type: 'success', msg: 'Email settings saved. Send a test email from the store page to verify.' });
    } catch (err) {
      setStatus({ type: 'error', msg: getApiErrorMessage(err, 'Failed to save') });
    } finally {
      setSaving(false);
    }
  };

  const saveTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const payload: any = {
        twilioFromPhone:   twilioFrom,
        twilioWhatsappNum: twilioWa,
      };
      if (twilioSid)  payload.twilioAccountSid = twilioSid;
      if (twilioAuth) payload.twilioAuthToken  = twilioAuth;
      await api.patch('/auth/settings', payload);
      setStatus({ type: 'success', msg: tab === 'sms' ? 'SMS credentials saved.' : 'WhatsApp credentials saved.' });
    } catch (err) {
      setStatus({ type: 'error', msg: getApiErrorMessage(err, 'Failed to save') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Settings" subtitle="Configure email, SMS, and WhatsApp for cart recovery">
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={26} className="animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">

          {/* Tab bar */}
          <div className="mb-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <TabBtn active={tab === 'email'}    onClick={() => { setTab('email');    setStatus(null); }} icon={<Mail size={15} />}          label="Email" />
            <TabBtn active={tab === 'sms'}      onClick={() => { setTab('sms');      setStatus(null); }} icon={<Phone size={15} />}         label="SMS" />
            <TabBtn active={tab === 'whatsapp'} onClick={() => { setTab('whatsapp'); setStatus(null); }} icon={<MessageSquare size={15} />} label="WhatsApp" />
          </div>

          {/* ── Email tab ── */}
          {tab === 'email' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Email sender settings</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Connect your email to send recovery emails to customers</p>
                </div>
                {smtpVerified ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-600">
                    <CheckCircle2 size={12} /> Verified
                  </span>
                ) : smtpUser ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">Configured</span>
                ) : null}
              </div>

              {status && <StatusBar type={status.type} msg={status.msg} />}

              {/* Provider picker */}
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Provider</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(PROVIDERS).map(([key, p]) => (
                    <button key={key} type="button" onClick={() => setEmailProvider(key)}
                      className={`rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
                        emailProvider === key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={saveEmail} className="space-y-4">
                {emailProvider === 'gmail' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="mb-1 text-xs font-semibold text-amber-800">Gmail App Password required</p>
                    <ol className="list-decimal pl-4 text-xs text-amber-700 space-y-0.5">
                      <li>Go to <strong>myaccount.google.com</strong> → Security</li>
                      <li>Enable <strong>2-Step Verification</strong></li>
                      <li>Search <strong>"App passwords"</strong> → Mail → Generate</li>
                      <li>Copy the 16-character code — paste below</li>
                    </ol>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={emailProvider === 'gmail' ? 'Gmail address' : 'Email / Username'}>
                    <input type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)}
                      placeholder="you@gmail.com" required className={inputCls} />
                  </Field>

                  <Field label={emailProvider === 'gmail' ? 'App Password' : 'Password'}
                    hint={smtpUser ? 'Leave blank to keep existing password' : undefined}>
                    <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)}
                      placeholder={smtpUser ? '••• saved — enter new to change •••' : (emailProvider === 'gmail' ? 'xxxx xxxx xxxx xxxx' : '••••••••')}
                      className={inputCls} />
                  </Field>

                  <Field label="From name / display name" hint="Shown in customer's inbox">
                    <input type="text" value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)}
                      placeholder="Your Store Name" className={inputCls} />
                  </Field>

                  {emailProvider === 'custom' && (
                    <>
                      <Field label="SMTP host">
                        <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)}
                          placeholder="mail.yourdomain.com" className={inputCls} />
                      </Field>
                      <Field label="SMTP port">
                        <input type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)}
                          placeholder="587" className={inputCls} />
                      </Field>
                    </>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving…' : 'Save email settings'}
                  </button>
                </div>
              </form>

              {/* Test email */}
              {smtpUser && (
                <form onSubmit={sendTestEmail} className="mt-5 border-t border-slate-100 pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Send a test email</p>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Field label="Send test to">
                        <input
                          type="email"
                          value={testTo}
                          onChange={e => setTestTo(e.target.value)}
                          placeholder="your@email.com"
                          className={inputCls}
                        />
                      </Field>
                    </div>
                    <button
                      type="submit"
                      disabled={testing}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap"
                    >
                      {testing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                      {testing ? 'Sending…' : 'Send test'}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">Sends a test email using your saved SMTP settings to confirm delivery works.</p>
                </form>
              )}
            </div>
          )}

          {/* ── SMS tab ── */}
          {tab === 'sms' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="font-semibold text-slate-900">SMS — Twilio</h2>
                <p className="text-xs text-slate-400 mt-0.5">Send text message reminders for abandoned carts</p>
              </div>

              {status && <StatusBar type={status.type} msg={status.msg} />}

              {/* Twilio setup guide */}
              <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-1 text-xs font-semibold text-blue-800">How to get Twilio credentials</p>
                <ol className="list-decimal pl-4 text-xs text-blue-700 space-y-0.5">
                  <li>Sign up at <strong>twilio.com</strong> (free trial includes $15 credit)</li>
                  <li>Go to <strong>Console</strong> → copy <strong>Account SID</strong> and <strong>Auth Token</strong></li>
                  <li>Buy a phone number: <strong>Phone Numbers → Buy a number</strong></li>
                  <li>Make sure the number has <strong>SMS capability</strong></li>
                </ol>
              </div>

              <form onSubmit={saveTwilio} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Account SID" hint={twilioSid ? 'Saved' : undefined}>
                    <input type="text" value={twilioSid} onChange={e => setTwilioSid(e.target.value)}
                      placeholder={twilioSid ? '••• saved •••' : 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                      className={inputCls} />
                  </Field>

                  <Field label="Auth Token" hint="Leave blank to keep existing">
                    <input type="password" value={twilioAuth} onChange={e => setTwilioAuth(e.target.value)}
                      placeholder={twilioSid ? '••• saved — enter new to change •••' : 'Your auth token'}
                      className={inputCls} />
                  </Field>

                  <Field label="From phone number" hint="Format: +1234567890">
                    <input type="text" value={twilioFrom} onChange={e => setTwilioFrom(e.target.value)}
                      placeholder="+1234567890" className={inputCls} />
                  </Field>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving…' : 'Save SMS credentials'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── WhatsApp tab ── */}
          {tab === 'whatsapp' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="font-semibold text-slate-900">WhatsApp — Twilio</h2>
                <p className="text-xs text-slate-400 mt-0.5">Send WhatsApp messages for higher open rates</p>
              </div>

              {status && <StatusBar type={status.type} msg={status.msg} />}

              <div className="mb-5 rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="mb-1 text-xs font-semibold text-green-800">WhatsApp via Twilio Sandbox</p>
                <ol className="list-decimal pl-4 text-xs text-green-700 space-y-0.5">
                  <li>In Twilio Console → <strong>Messaging → Try it out → Send a WhatsApp message</strong></li>
                  <li>Follow the sandbox activation steps (send "join [code]" to the sandbox number)</li>
                  <li>For production: apply for <strong>WhatsApp Business API</strong> access in Twilio</li>
                  <li>The sandbox number is usually <strong>+14155238886</strong></li>
                </ol>
              </div>

              <form onSubmit={saveTwilio} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Account SID" hint={twilioSid ? 'Shared with SMS (already saved)' : undefined}>
                    <input type="text" value={twilioSid} onChange={e => setTwilioSid(e.target.value)}
                      placeholder={twilioSid ? '••• saved •••' : 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                      className={inputCls} />
                  </Field>

                  <Field label="Auth Token" hint="Leave blank to keep existing">
                    <input type="password" value={twilioAuth} onChange={e => setTwilioAuth(e.target.value)}
                      placeholder={twilioSid ? '••• saved — enter new to change •••' : 'Your auth token'}
                      className={inputCls} />
                  </Field>

                  <Field label="WhatsApp from number" hint="Sandbox: whatsapp:+14155238886">
                    <input type="text" value={twilioWa} onChange={e => setTwilioWa(e.target.value)}
                      placeholder="whatsapp:+14155238886" className={inputCls} />
                  </Field>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving…' : 'Save WhatsApp credentials'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Info card */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">How it works</p>
            <div className="space-y-2.5">
              {[
                { icon: <Mail size={14} className="text-teal-500" />, text: 'Email — sent 3 hours after cart inactivity (customer must have entered email at checkout)' },
                { icon: <Phone size={14} className="text-blue-500" />, text: 'SMS — sent via Twilio to the customer\'s phone number (captured from WooCommerce billing)' },
                { icon: <MessageSquare size={14} className="text-green-500" />, text: 'WhatsApp — sent via Twilio WhatsApp API for higher open rates than SMS' },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0">{r.icon}</span>
                  <p className="text-xs text-slate-500">{r.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
