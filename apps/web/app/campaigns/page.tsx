'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Clock,
  FileText,
  Mail,
  MessageCircle,
  Save,
  Smartphone,
  Store as StoreIcon,
} from 'lucide-react';
import Link from 'next/link';
import { AppShell } from '../components/AppShell';
import {
  Alert,
  EmptyState,
  LoadingRow,
  StatCard,
} from '../components/Ui';
import {
  api,
  getApiErrorMessage,
  saveCampaign,
} from '../lib/api';
import type {
  Campaign,
  Store,
} from '../lib/types';
import {
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_SMS_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE,
  TEMPLATE_TOKENS,
  renderTemplate,
} from '../lib/templates';

export default function CampaignsPage() {
  const [stores, setStores] =
    useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] =
    useState('');
  const [emailEnabled, setEmailEnabled] =
    useState(true);
  const [whatsappEnabled, setWhatsappEnabled] =
    useState(false);
  const [smsEnabled, setSmsEnabled] =
    useState(false);
  const [emailDelay, setEmailDelay] =
    useState(30);
  const [whatsappDelay, setWhatsappDelay] =
    useState(60);
  const [smsDelay, setSmsDelay] =
    useState(120);
  const [emailTemplate, setEmailTemplate] =
    useState(DEFAULT_EMAIL_TEMPLATE);
  const [whatsappTemplate, setWhatsappTemplate] =
    useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [smsTemplate, setSmsTemplate] =
    useState(DEFAULT_SMS_TEMPLATE);
  const [loading, setLoading] =
    useState(true);
  const [campaignLoading, setCampaignLoading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState('');
  const [error, setError] =
    useState('');

  const selectedStore = useMemo(
    () =>
      stores.find(
        (store) =>
          store.id === selectedStoreId,
      ),
    [selectedStoreId, stores],
  );

  const emailPreview = useMemo(
    () =>
      renderTemplate(emailTemplate),
    [emailTemplate],
  );

  const whatsappPreview = useMemo(
    () =>
      renderTemplate(whatsappTemplate),
    [whatsappTemplate],
  );

  const smsPreview = useMemo(
    () =>
      renderTemplate(smsTemplate),
    [smsTemplate],
  );

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');

      const response =
        await api.get<Store[]>('/stores');

      setStores(response.data);

      if (response.data.length > 0) {
        setSelectedStoreId(
          response.data[0].id,
        );
      }
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Failed to load stores',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaign = async (
    storeId: string,
  ) => {
    try {
      setCampaignLoading(true);
      setError('');

      const response =
        await api.get<Campaign | null>(
          `/campaigns/${storeId}`,
        );

      if (!response.data) {
        setEmailEnabled(true);
        setWhatsappEnabled(false);
        setSmsEnabled(false);
        setEmailDelay(30);
        setWhatsappDelay(60);
        setSmsDelay(120);
        setEmailTemplate(
          DEFAULT_EMAIL_TEMPLATE,
        );
        setWhatsappTemplate(
          DEFAULT_WHATSAPP_TEMPLATE,
        );
        setSmsTemplate(
          DEFAULT_SMS_TEMPLATE,
        );
        return;
      }

      setEmailEnabled(
        response.data.emailEnabled,
      );
      setWhatsappEnabled(
        response.data.whatsappEnabled,
      );
      setSmsEnabled(
        response.data.smsEnabled,
      );
      setEmailDelay(
        response.data.emailDelayMin,
      );
      setWhatsappDelay(
        response.data.whatsappDelayMin,
      );
      setSmsDelay(
        response.data.smsDelayMin,
      );
      setEmailTemplate(
        response.data.emailTemplate ||
          DEFAULT_EMAIL_TEMPLATE,
      );
      setWhatsappTemplate(
        response.data.whatsappTemplate ||
          DEFAULT_WHATSAPP_TEMPLATE,
      );
      setSmsTemplate(
        response.data.smsTemplate ||
          DEFAULT_SMS_TEMPLATE,
      );
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Failed to load campaign',
        ),
      );
    } finally {
      setCampaignLoading(false);
    }
  };

  useEffect(() => {
    void fetchStores();
  }, []);

  useEffect(() => {
    if (selectedStoreId) {
      void fetchCampaign(
        selectedStoreId,
      );
    }
  }, [selectedStoreId]);

  const handleSave = async () => {
    if (!selectedStoreId) {
      setError(
        'Please select a store first.',
      );
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      setError('');

      await saveCampaign(
        selectedStoreId,
        {
          emailEnabled,
          whatsappEnabled,
          smsEnabled,
          emailDelayMin:
            emailDelay,
          whatsappDelayMin:
            whatsappDelay,
          smsDelayMin:
            smsDelay,
          emailTemplate,
          whatsappTemplate,
          smsTemplate,
        },
      );

      setMessage(
        'Campaign saved successfully.',
      );
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Failed to save campaign',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Campaigns"
      subtitle="Configure timing, channels, and message templates per store."
      action={
        <div className="flex items-center gap-2">
          <Link
            href={
              selectedStoreId
                ? `/templates?storeId=${selectedStoreId}`
                : '/templates'
            }
            className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex"
          >
            <FileText size={16} />
            Create template
          </Link>
          <button
            onClick={handleSave}
            disabled={
              saving ||
              !selectedStoreId
            }
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Save size={16} />
            {saving
              ? 'Saving'
              : 'Save campaign'}
          </button>
        </div>
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Selected store"
            value={
              selectedStore?.name ||
              'None'
            }
            helper={
              selectedStore?.domain ||
              'Add a store to begin'
            }
            icon={<StoreIcon size={19} />}
          />
          <StatCard
            label="Email delay"
            value={`${emailDelay}m`}
            helper={
              emailEnabled
                ? 'Email enabled'
                : 'Email disabled'
            }
            icon={<Mail size={19} />}
          />
          <StatCard
            label="WhatsApp delay"
            value={`${whatsappDelay}m`}
            helper={
              whatsappEnabled
                ? 'WhatsApp enabled'
                : 'WhatsApp disabled'
            }
            icon={<MessageCircle size={19} />}
          />
          <StatCard
            label="SMS follow-up"
            value={`${smsDelay}m`}
            helper={
              smsEnabled
                ? 'SMS enabled'
                : 'SMS disabled'
            }
            icon={<Smartphone size={19} />}
          />
        </section>

        {loading ? (
          <LoadingRow label="Loading campaign workspace..." />
        ) : stores.length === 0 ? (
          <EmptyState
            title="No stores available"
            description="Create a store first, then return here to configure its recovery campaign."
          />
        ) : (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Store
                  </span>
                  <select
                    value={selectedStoreId}
                    onChange={(e) =>
                      setSelectedStoreId(
                        e.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                  >
                    {stores.map((store) => (
                      <option
                        key={store.id}
                        value={store.id}
                      >
                        {store.name} - {store.domain}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <Clock
                    size={18}
                    className="text-slate-500"
                  />
                  <div>
                    <h2 className="text-base font-semibold">
                      Recovery schedule
                    </h2>
                    <p className="text-sm text-slate-500">
                      Choose which channels send and when.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <ChannelControl
                    title="Email recovery"
                    enabled={emailEnabled}
                    delay={emailDelay}
                    onEnabledChange={
                      setEmailEnabled
                    }
                    onDelayChange={setEmailDelay}
                  />
                  <ChannelControl
                    title="WhatsApp recovery"
                    enabled={whatsappEnabled}
                    delay={whatsappDelay}
                    onEnabledChange={
                      setWhatsappEnabled
                    }
                    onDelayChange={
                      setWhatsappDelay
                    }
                  />
                  <ChannelControl
                    title="SMS follow-up"
                    enabled={smsEnabled}
                    delay={smsDelay}
                    onEnabledChange={
                      setSmsEnabled
                    }
                    onDelayChange={setSmsDelay}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold">
                  Template tokens
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use these placeholders in messages.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {TEMPLATE_TOKENS.map((token) => (
                    <button
                      key={token}
                      type="button"
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          'text/plain',
                          token,
                        )
                      }
                      className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {campaignLoading && (
                <LoadingRow label="Loading saved campaign..." />
              )}

              <TemplateEditor
                title="Email template"
                value={emailTemplate}
                preview={emailPreview}
                onChange={setEmailTemplate}
              />

              <TemplateEditor
                title="WhatsApp template"
                channel="whatsapp"
                value={whatsappTemplate}
                preview={whatsappPreview}
                onChange={setWhatsappTemplate}
              />

              <TemplateEditor
                title="SMS template"
                channel="sms"
                value={smsTemplate}
                preview={smsPreview}
                onChange={setSmsTemplate}
                compact
              />
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function ChannelControl({
  title,
  enabled,
  delay,
  onEnabledChange,
  onDelayChange,
}: {
  title: string;
  enabled: boolean;
  delay: number;
  onEnabledChange: (value: boolean) => void;
  onDelayChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {title}
          </p>
          <p className="text-xs text-slate-500">
            Send after {delay} minutes
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) =>
              onEnabledChange(
                e.target.checked,
              )
            }
            className="h-4 w-4"
          />
          Enabled
        </label>
      </div>
      <input
        type="range"
        min={5}
        max={240}
        step={5}
        value={delay}
        onChange={(e) =>
          onDelayChange(
            Number(e.target.value),
          )
        }
        className="mt-4 w-full"
      />
      <input
        type="number"
        min={0}
        value={delay}
        onChange={(e) =>
          onDelayChange(
            Number(e.target.value),
          )
        }
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function TemplateEditor({
  title,
  channel = 'email',
  value,
  preview,
  onChange,
  compact = false,
}: {
  title: string;
  channel?: 'email' | 'whatsapp' | 'sms';
  value: string;
  preview: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const insertToken = (
    token: string,
    target:
      | HTMLTextAreaElement
      | null,
  ) => {
    if (!target) {
      onChange(`${value} ${token}`);
      return;
    }

    const start = target.selectionStart;
    const end = target.selectionEnd;

    onChange(
      `${value.slice(0, start)}${token}${value.slice(end)}`,
    );

    requestAnimationFrame(() => {
      target.focus();
      const nextPosition =
        start + token.length;
      target.setSelectionRange(
        nextPosition,
        nextPosition,
      );
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-950">
            {title}
          </span>
          <textarea
            rows={compact ? 5 : 10}
            value={value}
            onDragOver={(e) =>
              e.preventDefault()
            }
            onDrop={(e) => {
              e.preventDefault();
              insertToken(
                e.dataTransfer.getData(
                  'text/plain',
                ),
                e.currentTarget,
              );
            }}
            onChange={(e) =>
              onChange(e.target.value)
            }
            className={`${compact ? 'h-36' : 'h-64'} w-full resize-none rounded-lg border border-slate-300 p-4 font-mono text-sm leading-6`}
          />
        </label>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-950">
            Preview
          </p>
          <CampaignTemplatePreview
            channel={channel}
            preview={preview}
            compact={compact}
          />
        </div>
      </div>
    </div>
  );
}

function CampaignTemplatePreview({
  channel,
  preview,
  compact,
}: {
  channel: 'email' | 'whatsapp' | 'sms';
  preview: string;
  compact: boolean;
}) {
  const heightClass = compact ? 'h-36' : 'h-64';

  if (channel === 'whatsapp') {
    return (
      <div className={`${heightClass} overflow-hidden rounded-lg border border-emerald-200 bg-[#efeae2]`}>
        <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2 text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
            AB
          </div>
          <div>
            <p className="text-xs font-semibold">
              Abandonment Buddy
            </p>
            <p className="text-[10px] text-white/75">
              online
            </p>
          </div>
        </div>
        <div className="flex h-[calc(100%-44px)] flex-col justify-end p-3">
          <div className="ml-auto max-w-[86%] overflow-hidden rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-2 text-xs leading-5 text-slate-900 shadow-sm">
            <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {preview}
            </div>
            <div className="mt-1 text-right text-[10px] text-slate-500">
              10:42 AM ✓✓
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${heightClass} whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700`}>
      {preview}
    </div>
  );
}
