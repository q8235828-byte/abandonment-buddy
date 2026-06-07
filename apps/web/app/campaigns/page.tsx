'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText,
  Loader2, Mail, MessageCircle, Pause, Play, Save,
  Send, Smartphone, Store as StoreIcon, X, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { AppShell } from '../components/AppShell';
import { Alert, EmptyState, LoadingRow, StatCard } from '../components/Ui';
import { api, getApiErrorMessage, saveCampaign } from '../lib/api';
import type { Campaign, Store } from '../lib/types';
import {
  DEFAULT_EMAIL_TEMPLATE, DEFAULT_SMS_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE, TEMPLATE_TOKENS, renderTemplate,
} from '../lib/templates';

// ── Toast notification ────────────────────────────────────────────────────────
function Toast({ type, msg, onClose }: { type: 'success' | 'error'; msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-xl backdrop-blur-sm transition-all ${
      type === 'success' ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-rose-200 bg-rose-50 text-rose-700'
    }`}>
      {type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
      <span className="text-sm font-medium">{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }) {
  const sm = size === 'sm';
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${checked ? 'bg-teal-500' : 'bg-slate-200'} ${sm ? 'h-5 w-9' : 'h-6 w-11'}`}>
      <span className={`pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? (sm ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0'} ${sm ? 'h-4 w-4' : 'h-5 w-5'}`} />
    </button>
  );
}

// ── Channel card ──────────────────────────────────────────────────────────────
const CHANNEL_META = {
  email:    { label: 'Email',    icon: Mail,          color: 'teal',   desc: 'Recovery email sent to customer inbox' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'green',  desc: 'WhatsApp message via Twilio' },
  sms:      { label: 'SMS',      icon: Smartphone,    color: 'blue',   desc: 'Text message via Twilio' },
};

const colorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  teal:  { bg: 'bg-teal-50',  text: 'text-teal-600',  border: 'border-teal-200',  dot: 'bg-teal-500' },
  green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500' },
  blue:  { bg: 'bg-blue-50',  text: 'text-blue-600',  border: 'border-blue-200',  dot: 'bg-blue-500' },
};

function ChannelCard({ channel, enabled, delay, onEnabledChange, onDelayChange, onTest, testing }: {
  channel: keyof typeof CHANNEL_META;
  enabled: boolean; delay: number;
  onEnabledChange: (v: boolean) => void;
  onDelayChange: (v: number) => void;
  onTest: () => void;
  testing: boolean;
}) {
  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;
  const c = colorMap[meta.color];
  const hrs = Math.floor(delay / 60);
  const mins = delay % 60;
  const timeLabel = hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins}m`;

  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${enabled ? `${c.border} ${c.bg}` : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${enabled ? `${c.bg} ${c.text}` : 'bg-slate-100 text-slate-400'}`}>
            <Icon size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
            <p className="text-xs text-slate-400">{meta.desc}</p>
          </div>
        </div>
        <Toggle checked={enabled} onChange={onEnabledChange} size="sm" />
      </div>

      {enabled && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">Send after cart abandonment</span>
            <span className={`text-xs font-bold ${c.text}`}>{timeLabel}</span>
          </div>
          <input type="range" min={5} max={480} step={5} value={delay}
            onChange={(e) => onDelayChange(Number(e.target.value))}
            className={`w-full mb-3 accent-${meta.color === 'teal' ? 'teal' : meta.color === 'green' ? 'green' : 'blue'}-500`} />
          <div className="flex gap-2">
            <input type="number" min={1} value={delay}
              onChange={(e) => onDelayChange(Number(e.target.value))}
              className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition" />
            <span className="flex items-center text-xs text-slate-400">minutes</span>
            <button type="button" onClick={onTest} disabled={testing}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
              {testing ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {testing ? 'Sending…' : 'Send test'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Recovery timeline ─────────────────────────────────────────────────────────
function RecoveryTimeline({ emailEnabled, emailDelay, whatsappEnabled, whatsappDelay, smsEnabled, smsDelay }: {
  emailEnabled: boolean; emailDelay: number;
  whatsappEnabled: boolean; whatsappDelay: number;
  smsEnabled: boolean; smsDelay: number;
}) {
  const steps = [
    { label: 'Cart abandoned', time: 0, icon: <Zap size={12} />, color: 'bg-amber-400', always: true },
    emailEnabled    && { label: 'Email sent',    time: emailDelay,    icon: <Mail size={12} />,          color: 'bg-teal-500' },
    whatsappEnabled && { label: 'WhatsApp sent', time: whatsappDelay, icon: <MessageCircle size={12} />, color: 'bg-green-500' },
    smsEnabled      && { label: 'SMS sent',      time: smsDelay,      icon: <Smartphone size={12} />,    color: 'bg-blue-500' },
  ].filter(Boolean) as Array<{ label: string; time: number; icon: React.ReactNode; color: string; always?: boolean }>;

  const sorted = [...steps].sort((a, b) => a.time - b.time);
  const maxTime = Math.max(...sorted.map((s) => s.time), 60);

  if (sorted.length <= 1) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
        Enable at least one channel to see the recovery timeline
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((step, i) => {
        const pct = (step.time / maxTime) * 100;
        const fmtTime = step.time === 0 ? 'Now' : step.time < 60 ? `+${step.time}m` : `+${Math.floor(step.time / 60)}h${step.time % 60 > 0 ? `${step.time % 60}m` : ''}`;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${step.color}`}>
              {step.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium text-slate-700">{step.label}</span>
                <span className="text-xs font-bold text-slate-500">{fmtTime}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${step.color} opacity-60`} style={{ width: `${Math.max(4, pct)}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Template editor ───────────────────────────────────────────────────────────
function TemplateEditor({ title, channel = 'email', value, preview, onChange, compact = false }: {
  title: string; channel?: 'email' | 'whatsapp' | 'sms';
  value: string; preview: string; onChange: (v: string) => void; compact?: boolean;
}) {
  const isHtml = channel === 'email' && value.trim().startsWith('<');

  const insertToken = (token: string, target: HTMLTextAreaElement | null) => {
    if (!target) { onChange(`${value} ${token}`); return; }
    const start = target.selectionStart, end = target.selectionEnd;
    onChange(`${value.slice(0, start)}${token}${value.slice(end)}`);
    requestAnimationFrame(() => { target.focus(); const p = start + token.length; target.setSelectionRange(p, p); });
  };

  const editorH = isHtml ? 'h-[500px]' : compact ? 'h-36' : 'h-64';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {isHtml && <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-600">HTML email</span>}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <textarea value={value}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); insertToken(e.dataTransfer.getData('text/plain'), e.currentTarget); }}
          onChange={(e) => onChange(e.target.value)}
          className={`${editorH} w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition`} />
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Live preview</p>
          {isHtml ? (
            <iframe srcDoc={preview} title="Email preview"
              className={`${editorH} w-full rounded-xl border border-slate-200 bg-white`}
              sandbox="allow-same-origin" />
          ) : channel === 'whatsapp' ? (
            <div className={`${editorH} overflow-hidden rounded-xl border border-emerald-200 bg-[#efeae2]`}>
              <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2 text-white">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">AB</div>
                <div><p className="text-xs font-semibold">Abandonment Buddy</p><p className="text-[10px] text-white/75">online</p></div>
              </div>
              <div className="flex h-[calc(100%-44px)] flex-col justify-end p-3">
                <div className="ml-auto max-w-[86%] overflow-hidden rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-2 text-xs leading-5 text-slate-900 shadow-sm">
                  <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{preview}</div>
                  <div className="mt-1 text-right text-[10px] text-slate-500">10:42 AM ✓✓</div>
                </div>
              </div>
            </div>
          ) : channel === 'sms' ? (
            <div className={`${editorH} flex items-end rounded-xl bg-slate-950 p-4`}>
              <div className="w-full max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-700 px-4 py-3 text-sm leading-6 text-white">
                {preview}
              </div>
            </div>
          ) : (
            <div className={`${compact ? 'h-36' : 'h-64'} whitespace-pre-wrap overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700`}>
              {preview}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [stores, setStores]                   = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [campaignActive, setCampaignActive]   = useState(true);
  const [emailEnabled, setEmailEnabled]       = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled]           = useState(false);
  const [emailDelay, setEmailDelay]           = useState(180);
  const [whatsappDelay, setWhatsappDelay]     = useState(240);
  const [smsDelay, setSmsDelay]               = useState(360);
  const [emailTemplate, setEmailTemplate]     = useState(DEFAULT_EMAIL_TEMPLATE);
  const [whatsappTemplate, setWhatsappTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [smsTemplate, setSmsTemplate]         = useState(DEFAULT_SMS_TEMPLATE);
  const [loading, setLoading]                 = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [testing, setTesting]                 = useState<string | null>(null);
  const [message, setMessage]                 = useState('');
  const [error, setError]                     = useState('');
  const [toast, setToast]                     = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const selectedStore = useMemo(() => stores.find((s) => s.id === selectedStoreId), [selectedStoreId, stores]);
  const emailPreview    = useMemo(() => renderTemplate(emailTemplate),    [emailTemplate]);
  const whatsappPreview = useMemo(() => renderTemplate(whatsappTemplate), [whatsappTemplate]);
  const smsPreview      = useMemo(() => renderTemplate(smsTemplate),      [smsTemplate]);

  const activeChannels = [emailEnabled, whatsappEnabled, smsEnabled].filter(Boolean).length;

  const fetchStores = async () => {
    try {
      setLoading(true); setError('');
      const res = await api.get<Store[]>('/stores');
      setStores(res.data);
      if (res.data.length > 0) setSelectedStoreId(res.data[0].id);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load stores'));
    } finally { setLoading(false); }
  };

  const fetchCampaign = async (storeId: string) => {
    try {
      setCampaignLoading(true); setError('');
      const res = await api.get<Campaign | null>(`/campaigns/${storeId}`);
      if (!res.data) {
        setEmailEnabled(true); setWhatsappEnabled(false); setSmsEnabled(false);
        setEmailDelay(180); setWhatsappDelay(240); setSmsDelay(360);
        setEmailTemplate(DEFAULT_EMAIL_TEMPLATE);
        setWhatsappTemplate(DEFAULT_WHATSAPP_TEMPLATE);
        setSmsTemplate(DEFAULT_SMS_TEMPLATE);
        setCampaignActive(true);
        return;
      }
      setEmailEnabled(res.data.emailEnabled);
      setWhatsappEnabled(res.data.whatsappEnabled);
      setSmsEnabled(res.data.smsEnabled);
      setEmailDelay(res.data.emailDelayMin);
      setWhatsappDelay(res.data.whatsappDelayMin);
      setSmsDelay(res.data.smsDelayMin);
      setEmailTemplate(res.data.emailTemplate || DEFAULT_EMAIL_TEMPLATE);
      setWhatsappTemplate(res.data.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE);
      setSmsTemplate(res.data.smsTemplate || DEFAULT_SMS_TEMPLATE);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load campaign'));
    } finally { setCampaignLoading(false); }
  };

  useEffect(() => { void fetchStores(); }, []);
  useEffect(() => { if (selectedStoreId) void fetchCampaign(selectedStoreId); }, [selectedStoreId]);

  const handleSave = async () => {
    if (!selectedStoreId) { setError('Please select a store first.'); return; }
    try {
      setSaving(true); setMessage(''); setError('');
      await saveCampaign(selectedStoreId, {
        emailEnabled, whatsappEnabled, smsEnabled,
        emailDelayMin: emailDelay, whatsappDelayMin: whatsappDelay, smsDelayMin: smsDelay,
        emailTemplate, whatsappTemplate, smsTemplate,
      });
      setToast({ type: 'success', msg: 'Campaign saved successfully.' });
    } catch (err) {
      setToast({ type: 'error', msg: getApiErrorMessage(err, 'Failed to save campaign') });
    } finally { setSaving(false); }
  };

  const handleTest = async (channel: string) => {
    if (!selectedStoreId) { setToast({ type: 'error', msg: 'Select a store first.' }); return; }
    setTesting(channel);
    try {
      await api.post(`/stores/${selectedStoreId}/test-email`);
      setToast({ type: 'success', msg: `Test ${channel} sent! Check your inbox.` });
    } catch (err) {
      setToast({ type: 'error', msg: getApiErrorMessage(err, `Failed to send test ${channel}`) });
    } finally { setTesting(null); }
  };

  return (
    <AppShell title="Campaigns" subtitle="Configure recovery timing, channels, and message templates."
      action={
        <div className="flex items-center gap-2">
          <Link href={selectedStoreId ? `/templates?storeId=${selectedStoreId}` : '/templates'}
            className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex">
            <FileText size={15} /> Templates
          </Link>
          <button onClick={handleSave} disabled={saving || !selectedStoreId}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save campaign'}
          </button>
        </div>
      }
    >
      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}

      <div className="space-y-6">
        {error   && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}

        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Selected store"  value={selectedStore?.name || 'None'} helper={selectedStore?.domain || 'Add a store to begin'} icon={<StoreIcon size={18} />} color="slate" />
          <StatCard label="Active channels" value={activeChannels}                helper={`${activeChannels} of 3 channels on`}            icon={<Zap size={18} />}       color={activeChannels > 0 ? 'teal' : 'amber'} />
          <StatCard label="Email delay"     value={`${emailDelay}m`}              helper={emailEnabled ? 'Email enabled' : 'Email disabled'} icon={<Mail size={18} />}      color="teal" />
          <StatCard label="Campaign status" value={campaignActive ? 'Active' : 'Paused'} helper={campaignActive ? 'Sending on abandonment' : 'No messages will send'} icon={campaignActive ? <Play size={18} /> : <Pause size={18} />} color={campaignActive ? 'teal' : 'amber'} />
        </section>

        {loading ? (
          <LoadingRow label="Loading campaign workspace…" />
        ) : stores.length === 0 ? (
          <EmptyState title="No stores available" description="Create a store first, then return here to configure its recovery campaign." />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">

            {/* ── Left panel ── */}
            <div className="space-y-4">

              {/* Store + master toggle */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Store</p>
                <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition mb-4">
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.domain}</option>)}
                </select>

                {/* Master ON/OFF */}
                <div className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition ${campaignActive ? 'border-teal-200 bg-teal-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2 w-2 rounded-full ${campaignActive ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{campaignActive ? 'Campaign active' : 'Campaign paused'}</p>
                      <p className="text-xs text-slate-400">{campaignActive ? 'Messages will send automatically' : 'No messages will be sent'}</p>
                    </div>
                  </div>
                  <Toggle checked={campaignActive} onChange={setCampaignActive} />
                </div>
              </div>

              {/* Channel cards */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50"><Clock size={17} className="text-slate-500" /></div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Recovery schedule</h2>
                    <p className="text-xs text-slate-400">Choose which channels send and when</p>
                  </div>
                </div>
                {campaignLoading ? (
                  <LoadingRow label="Loading campaign…" />
                ) : (
                  <div className="space-y-3">
                    <ChannelCard channel="email"    enabled={emailEnabled}    delay={emailDelay}    onEnabledChange={setEmailEnabled}    onDelayChange={setEmailDelay}    onTest={() => handleTest('email')}    testing={testing === 'email'} />
                    <ChannelCard channel="whatsapp" enabled={whatsappEnabled} delay={whatsappDelay} onEnabledChange={setWhatsappEnabled} onDelayChange={setWhatsappDelay} onTest={() => handleTest('whatsapp')} testing={testing === 'whatsapp'} />
                    <ChannelCard channel="sms"      enabled={smsEnabled}      delay={smsDelay}      onEnabledChange={setSmsEnabled}      onDelayChange={setSmsDelay}      onTest={() => handleTest('sms')}      testing={testing === 'sms'} />
                  </div>
                )}
              </div>

              {/* Recovery timeline */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50"><ArrowRight size={17} className="text-slate-500" /></div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Recovery timeline</h2>
                    <p className="text-xs text-slate-400">Message sequence after cart is abandoned</p>
                  </div>
                </div>
                <RecoveryTimeline
                  emailEnabled={emailEnabled}       emailDelay={emailDelay}
                  whatsappEnabled={whatsappEnabled} whatsappDelay={whatsappDelay}
                  smsEnabled={smsEnabled}           smsDelay={smsDelay}
                />
              </div>

              {/* Template tokens */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-1 text-sm font-semibold text-slate-900">Template tokens</h2>
                <p className="mb-3 text-xs text-slate-400">Drag into the editor or click to copy.</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_TOKENS.map((token) => (
                    <button key={token} type="button" draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', token)}
                      onClick={() => navigator.clipboard.writeText(token)}
                      className="cursor-grab rounded-full bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700 hover:bg-slate-200 active:cursor-grabbing transition"
                      title="Click to copy, drag into editor">
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right panel: templates ── */}
            <div className="space-y-5">
              {campaignLoading && <LoadingRow label="Loading saved templates…" />}

              {emailEnabled && (
                <TemplateEditor title="Email template" channel="email" value={emailTemplate} preview={emailPreview} onChange={setEmailTemplate} />
              )}
              {whatsappEnabled && (
                <TemplateEditor title="WhatsApp template" channel="whatsapp" value={whatsappTemplate} preview={whatsappPreview} onChange={setWhatsappTemplate} />
              )}
              {smsEnabled && (
                <TemplateEditor title="SMS template" channel="sms" value={smsTemplate} preview={smsPreview} onChange={setSmsTemplate} compact />
              )}

              {!emailEnabled && !whatsappEnabled && !smsEnabled && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <Mail size={24} className="text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-600">No channels enabled</p>
                  <p className="mt-1 text-sm text-slate-400">Enable at least one channel on the left to edit its message template.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
