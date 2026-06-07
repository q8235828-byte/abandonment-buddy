'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, FileText, Mail, MessageCircle, Save, Smartphone, Store as StoreIcon } from 'lucide-react';
import Link from 'next/link';
import { AppShell } from '../components/AppShell';
import { Alert, EmptyState, LoadingRow, StatCard } from '../components/Ui';
import { api, getApiErrorMessage, saveCampaign } from '../lib/api';
import type { Campaign, Store } from '../lib/types';
import { DEFAULT_EMAIL_TEMPLATE, DEFAULT_SMS_TEMPLATE, DEFAULT_WHATSAPP_TEMPLATE, TEMPLATE_TOKENS, renderTemplate } from '../lib/templates';

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${checked ? 'bg-teal-500' : 'bg-slate-200'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// ── Channel control ───────────────────────────────────────────────────────────
function ChannelControl({ title, enabled, delay, onEnabledChange, onDelayChange }: {
  title: string; enabled: boolean; delay: number;
  onEnabledChange: (v: boolean) => void; onDelayChange: (v: number) => void;
}) {
  return (
    <div className={`rounded-xl border p-4 transition ${enabled ? 'border-teal-200 bg-teal-50/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">Send after <span className="font-medium text-slate-700">{delay} min</span></p>
        </div>
        <Toggle checked={enabled} onChange={onEnabledChange} />
      </div>
      <input type="range" min={5} max={240} step={5} value={delay}
        onChange={(e) => onDelayChange(Number(e.target.value))} className="w-full accent-teal-500 mb-3" />
      <input type="number" min={0} value={delay}
        onChange={(e) => onDelayChange(Number(e.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition" />
    </div>
  );
}

// ── Template editor ───────────────────────────────────────────────────────────
function TemplateEditor({ title, channel = 'email', value, preview, onChange, compact = false }: {
  title: string; channel?: 'email' | 'whatsapp' | 'sms';
  value: string; preview: string; onChange: (v: string) => void; compact?: boolean;
}) {
  const insertToken = (token: string, target: HTMLTextAreaElement | null) => {
    if (!target) { onChange(`${value} ${token}`); return; }
    const start = target.selectionStart;
    const end = target.selectionEnd;
    onChange(`${value.slice(0, start)}${token}${value.slice(end)}`);
    requestAnimationFrame(() => { target.focus(); const p = start + token.length; target.setSelectionRange(p, p); });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block">
          <textarea rows={compact ? 5 : 10} value={value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); insertToken(e.dataTransfer.getData('text/plain'), e.currentTarget); }}
            onChange={(e) => onChange(e.target.value)}
            className={`${compact ? 'h-36' : 'h-64'} w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition`} />
        </label>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Preview</p>
          {channel === 'whatsapp' ? (
            <div className={`${compact ? 'h-36' : 'h-64'} overflow-hidden rounded-xl border border-emerald-200 bg-[#efeae2]`}>
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
  const [stores, setStores]               = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [emailEnabled, setEmailEnabled]   = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled]       = useState(false);
  const [emailDelay, setEmailDelay]       = useState(30);
  const [whatsappDelay, setWhatsappDelay] = useState(60);
  const [smsDelay, setSmsDelay]           = useState(120);
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [whatsappTemplate, setWhatsappTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [smsTemplate, setSmsTemplate]     = useState(DEFAULT_SMS_TEMPLATE);
  const [loading, setLoading]             = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [message, setMessage]             = useState('');
  const [error, setError]                 = useState('');

  const selectedStore = useMemo(() => stores.find((s) => s.id === selectedStoreId), [selectedStoreId, stores]);
  const emailPreview    = useMemo(() => renderTemplate(emailTemplate),    [emailTemplate]);
  const whatsappPreview = useMemo(() => renderTemplate(whatsappTemplate), [whatsappTemplate]);
  const smsPreview      = useMemo(() => renderTemplate(smsTemplate),      [smsTemplate]);

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
        setEmailDelay(30); setWhatsappDelay(60); setSmsDelay(120);
        setEmailTemplate(DEFAULT_EMAIL_TEMPLATE); setWhatsappTemplate(DEFAULT_WHATSAPP_TEMPLATE); setSmsTemplate(DEFAULT_SMS_TEMPLATE);
        return;
      }
      setEmailEnabled(res.data.emailEnabled); setWhatsappEnabled(res.data.whatsappEnabled); setSmsEnabled(res.data.smsEnabled);
      setEmailDelay(res.data.emailDelayMin); setWhatsappDelay(res.data.whatsappDelayMin); setSmsDelay(res.data.smsDelayMin);
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
      await saveCampaign(selectedStoreId, { emailEnabled, whatsappEnabled, smsEnabled, emailDelayMin: emailDelay, whatsappDelayMin: whatsappDelay, smsDelayMin: smsDelay, emailTemplate, whatsappTemplate, smsTemplate });
      setMessage('Campaign saved successfully.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save campaign'));
    } finally { setSaving(false); }
  };

  return (
    <AppShell title="Campaigns" subtitle="Configure timing, channels, and message templates per store."
      action={
        <div className="flex items-center gap-2">
          <Link href={selectedStoreId ? `/templates?storeId=${selectedStoreId}` : '/templates'}
            className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex">
            <FileText size={15} /> Templates
          </Link>
          <button onClick={handleSave} disabled={saving || !selectedStoreId}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition">
            <Save size={15} />
            {saving ? 'Saving…' : 'Save campaign'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error   && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}

        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Selected store"  value={selectedStore?.name || 'None'} helper={selectedStore?.domain || 'Add a store to begin'} icon={<StoreIcon size={18} />} color="slate" />
          <StatCard label="Email delay"     value={`${emailDelay}m`}    helper={emailEnabled ? 'Email enabled' : 'Email disabled'}          icon={<Mail size={18} />}          color="teal" />
          <StatCard label="WhatsApp delay"  value={`${whatsappDelay}m`} helper={whatsappEnabled ? 'WhatsApp enabled' : 'WhatsApp disabled'}  icon={<MessageCircle size={18} />} color="violet" />
          <StatCard label="SMS follow-up"   value={`${smsDelay}m`}      helper={smsEnabled ? 'SMS enabled' : 'SMS disabled'}                 icon={<Smartphone size={18} />}    color="amber" />
        </section>

        {loading ? (
          <LoadingRow label="Loading campaign workspace…" />
        ) : stores.length === 0 ? (
          <EmptyState title="No stores available" description="Create a store first, then return here to configure its recovery campaign." />
        ) : (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">

              {/* Store selector */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Store</p>
                <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition">
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name} — {store.domain}</option>
                  ))}
                </select>
              </div>

              {/* Channel controls */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><Clock size={17} /></div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Recovery schedule</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Choose which channels send and when.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <ChannelControl title="Email recovery"   enabled={emailEnabled}    delay={emailDelay}    onEnabledChange={setEmailEnabled}    onDelayChange={setEmailDelay} />
                  <ChannelControl title="WhatsApp recovery" enabled={whatsappEnabled} delay={whatsappDelay} onEnabledChange={setWhatsappEnabled} onDelayChange={setWhatsappDelay} />
                  <ChannelControl title="SMS follow-up"    enabled={smsEnabled}      delay={smsDelay}      onEnabledChange={setSmsEnabled}      onDelayChange={setSmsDelay} />
                </div>
              </div>

              {/* Tokens */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Template tokens</h2>
                <p className="mt-1 text-xs text-slate-400">Drag into the editor or click to insert.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {TEMPLATE_TOKENS.map((token) => (
                    <button key={token} type="button" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', token)}
                      className="cursor-grab rounded-full bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700 hover:bg-slate-200 active:cursor-grabbing transition">
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {campaignLoading && <LoadingRow label="Loading saved campaign…" />}
              <TemplateEditor title="Email template"    channel="email"    value={emailTemplate}    preview={emailPreview}    onChange={setEmailTemplate} />
              <TemplateEditor title="WhatsApp template" channel="whatsapp" value={whatsappTemplate} preview={whatsappPreview} onChange={setWhatsappTemplate} />
              <TemplateEditor title="SMS template"      channel="sms"      value={smsTemplate}      preview={smsPreview}      onChange={setSmsTemplate} compact />
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
