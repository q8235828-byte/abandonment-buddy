'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clipboard,
  Mail,
  MessageCircle,
  RotateCcw,
  Save,
  Smartphone,
  Trash2,
} from 'lucide-react';
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
import {
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_SMS_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE,
  TEMPLATE_TOKENS,
} from '../lib/templates';
import type {
  Campaign,
  Store,
} from '../lib/types';

type Channel = 'email' | 'whatsapp' | 'sms';

const channels: {
  id: Channel;
  label: string;
  icon: typeof Mail;
}[] = [
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
  },
  {
    id: 'sms',
    label: 'SMS',
    icon: Smartphone,
  },
];

export default function TemplatesPage() {
  const [stores, setStores] =
    useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] =
    useState('');
  const [activeChannel, setActiveChannel] =
    useState<Channel>('email');
  const [emailTemplate, setEmailTemplate] =
    useState(DEFAULT_EMAIL_TEMPLATE);
  const [whatsappTemplate, setWhatsappTemplate] =
    useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [smsTemplate, setSmsTemplate] =
    useState(DEFAULT_SMS_TEMPLATE);
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
  const [sampleName, setSampleName] =
    useState('Sarah');
  const [sampleStore, setSampleStore] =
    useState('Demo Store');
  const [sampleCheckout, setSampleCheckout] =
    useState('https://store.com/checkout/recover');
  const [sampleCartValue, setSampleCartValue] =
    useState('$84.50');
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

  const currentTemplate =
    activeChannel === 'email'
      ? emailTemplate
      : activeChannel === 'whatsapp'
        ? whatsappTemplate
        : smsTemplate;

  const currentPreview = useMemo(
    () =>
      renderTemplateWithSamples(
        currentTemplate,
        {
          customerName: sampleName,
          storeName: sampleStore,
          checkoutLink:
            sampleCheckout,
          cartValue:
            sampleCartValue,
        },
      ),
    [
      currentTemplate,
      sampleCartValue,
      sampleCheckout,
      sampleName,
      sampleStore,
    ],
  );

  const currentMeta =
    activeChannel === 'email'
      ? {
          enabled: emailEnabled,
          delay: emailDelay,
          setTemplate:
            setEmailTemplate,
          setEnabled:
            setEmailEnabled,
          setDelay: setEmailDelay,
        }
      : activeChannel === 'whatsapp'
        ? {
            enabled: whatsappEnabled,
            delay: whatsappDelay,
            setTemplate:
              setWhatsappTemplate,
            setEnabled:
              setWhatsappEnabled,
            setDelay:
              setWhatsappDelay,
          }
        : {
            enabled: smsEnabled,
            delay: smsDelay,
            setTemplate:
              setSmsTemplate,
            setEnabled:
              setSmsEnabled,
            setDelay: setSmsDelay,
          };

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');

      const response =
        await api.get<Store[]>('/stores');

      const params =
        new URLSearchParams(
          window.location.search,
        );
      const requestedStore =
        params.get('storeId');
      const defaultStoreId =
        requestedStore &&
        response.data.some(
          (store) =>
            store.id === requestedStore,
        )
          ? requestedStore
          : response.data[0]?.id || '';

      setStores(response.data);
      setSelectedStoreId(
        defaultStoreId,
      );
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
        setEmailTemplate(
          DEFAULT_EMAIL_TEMPLATE,
        );
        setWhatsappTemplate(
          DEFAULT_WHATSAPP_TEMPLATE,
        );
        setSmsTemplate(
          DEFAULT_SMS_TEMPLATE,
        );
        setEmailEnabled(true);
        setWhatsappEnabled(false);
        setSmsEnabled(false);
        setEmailDelay(30);
        setWhatsappDelay(60);
        setSmsDelay(120);
        return;
      }

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
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Failed to load templates',
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
        'Template changes saved to this store campaign.',
      );
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Failed to save templates',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Templates"
      subtitle="Create recovery message templates with email, WhatsApp, and SMS previews."
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/campaigns"
            className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex"
          >
            <ArrowLeft size={16} />
            Campaigns
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
              : 'Save template'}
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

        {loading ? (
          <LoadingRow label="Loading template editor..." />
        ) : stores.length === 0 ? (
          <EmptyState
            title="No stores available"
            description="Create a store before building recovery templates."
          />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <StatCard label="Store"    value={selectedStore?.name || 'None'} helper={selectedStore?.domain || 'Select a store'} icon={<Mail size={18} />}          color="slate" />
              <StatCard label="Email"    value={`${emailDelay}m`}    helper={emailEnabled    ? 'Enabled' : 'Disabled'} icon={<Mail size={18} />}          color="teal" />
              <StatCard label="WhatsApp" value={`${whatsappDelay}m`} helper={whatsappEnabled ? 'Enabled' : 'Disabled'} icon={<MessageCircle size={18} />} color="violet" />
              <StatCard label="SMS"      value={`${smsDelay}m`}      helper={smsEnabled      ? 'Enabled' : 'Disabled'} icon={<Smartphone size={18} />}    color="amber" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">
              <div className="space-y-6">
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_0.9fr]">
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition"
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

                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Channel
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                    {channels.map((channel) => {
                      const Icon = channel.icon;
                      const active =
                        activeChannel === channel.id;

                      return (
                        <button
                          key={channel.id}
                          onClick={() =>
                            setActiveChannel(
                              channel.id,
                            )
                          }
                          className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm font-medium ${
                            active
                              ? 'border-slate-950 bg-slate-950 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={17} />
                          {channel.label}
                        </button>
                      );
                    })}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {campaignLoading && (
                    <div className="mb-4">
                      <LoadingRow label="Loading saved template..." />
                    </div>
                  )}

                  <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        {activeChannelLabel(activeChannel)} template editor
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Drag tokens into the editor or click a token to insert it.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <EditorAction
                        label="Copy"
                        icon={<Clipboard size={15} />}
                        onClick={() =>
                          copyText(
                            currentTemplate,
                            'Template copied.',
                            setMessage,
                          )
                        }
                      />
                      <EditorAction
                        label="Reset"
                        icon={<RotateCcw size={15} />}
                        onClick={() =>
                          currentMeta.setTemplate(
                            defaultTemplateFor(
                              activeChannel,
                            ),
                          )
                        }
                      />
                      <EditorAction
                        label="Clear"
                        icon={<Trash2 size={15} />}
                        onClick={() =>
                          currentMeta.setTemplate('')
                        }
                      />
                    </div>
                  </div>

                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                      Template tokens
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TEMPLATE_TOKENS.map(
                        (token) => (
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
                            onClick={() =>
                              currentMeta.setTemplate(
                                `${currentTemplate} ${token}`,
                              )
                            }
                            className="cursor-grab rounded-full bg-white px-3 py-1.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 active:cursor-grabbing"
                            title="Drag into the editor"
                          >
                            {token}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-950">
                      <span>Editor</span>
                      <span className="text-xs font-medium text-slate-500">
                        {currentTemplate.length} chars
                      </span>
                    </span>
                    <textarea
                      rows={
                        activeChannel === 'sms'
                          ? 8
                          : 14
                      }
                      value={currentTemplate}
                      onDragOver={(e) =>
                        e.preventDefault()
                      }
                      onDrop={(e) => {
                        e.preventDefault();
                        const token =
                          e.dataTransfer.getData(
                            'text/plain',
                          );
                        const target =
                          e.currentTarget;
                        const start =
                          target.selectionStart;
                        const end =
                          target.selectionEnd;

                        currentMeta.setTemplate(
                          `${currentTemplate.slice(0, start)}${token}${currentTemplate.slice(end)}`,
                        );

                        requestAnimationFrame(
                          () => {
                            target.focus();
                            const nextPosition =
                              start +
                              token.length;
                            target.setSelectionRange(
                              nextPosition,
                              nextPosition,
                            );
                          },
                        );
                      }}
                      onChange={(e) =>
                        currentMeta.setTemplate(
                          e.target.value,
                        )
                      }
                      className="h-96 w-full resize-none rounded-lg border border-slate-300 p-4 font-mono text-sm leading-6"
                    />
                  </label>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-950">
                        Live preview
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            currentPreview,
                            'Preview copied.',
                            setMessage,
                          )
                        }
                        className="text-xs font-medium text-slate-600 hover:text-slate-950"
                      >
                        Copy preview
                      </button>
                    </div>
                    <TemplatePreview
                      channel={activeChannel}
                      preview={currentPreview}
                    />
                  </div>
                </div>
              </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-950">
                    Control panel
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Configure delivery and preview data for this channel.
                  </p>

                  <label className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
                    <span>Channel enabled</span>
                    <input
                      type="checkbox"
                      checked={
                        currentMeta.enabled
                      }
                      onChange={(e) =>
                        currentMeta.setEnabled(
                          e.target.checked,
                        )
                      }
                      className="h-4 w-4"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Follow-up delay
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={240}
                      step={5}
                      value={currentMeta.delay}
                      onChange={(e) =>
                        currentMeta.setDelay(
                          Number(
                            e.target.value,
                          ),
                        )
                      }
                      className="w-full"
                    />
                    <input
                      type="number"
                      min={0}
                      value={currentMeta.delay}
                      onChange={(e) =>
                        currentMeta.setDelay(
                          Number(
                            e.target.value,
                          ),
                        )
                      }
                      className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-950">
                    Preview data
                  </h2>
                  <div className="mt-4 space-y-3">
                    <PreviewInput
                      label="Customer"
                      value={sampleName}
                      onChange={setSampleName}
                    />
                    <PreviewInput
                      label="Store"
                      value={sampleStore}
                      onChange={setSampleStore}
                    />
                    <PreviewInput
                      label="Cart value"
                      value={sampleCartValue}
                      onChange={setSampleCartValue}
                    />
                    <PreviewInput
                      label="Checkout link"
                      value={sampleCheckout}
                      onChange={setSampleCheckout}
                    />
                  </div>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function TemplatePreview({
  channel,
  preview,
}: {
  channel: Channel;
  preview: string;
}) {
  if (channel === 'whatsapp') {
    return (
      <div className="h-96 overflow-hidden rounded-lg border border-emerald-200 bg-[#efeae2]">
        <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
            AB
          </div>
          <div>
            <p className="text-sm font-semibold">
              Abandonment Buddy
            </p>
            <p className="text-xs text-white/75">
              online
            </p>
          </div>
        </div>

        <div className="flex h-[calc(24rem-60px)] flex-col justify-end p-4">
          <div className="ml-auto max-w-[82%] overflow-hidden rounded-lg rounded-tr-none bg-[#dcf8c6] px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm">
            <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {preview}
            </div>
            <div className="mt-2 text-right text-[11px] text-slate-500">
              10:42 AM ✓✓
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (channel === 'sms') {
    return (
      <div className="h-96 rounded-lg border border-slate-200 bg-slate-950 p-4 text-slate-100">
        <div className="mx-auto flex h-full max-w-xs flex-col justify-end rounded-[28px] border border-slate-700 bg-slate-900 p-4">
          <div className="rounded-2xl rounded-bl-md bg-slate-700 px-4 py-3 text-sm leading-6">
            {preview}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Recovery email
        </p>
        <div className="mt-4 whitespace-pre-wrap">
          {preview}
        </div>
      </div>
    </div>
  );
}

function EditorAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {icon}
      {label}
    </button>
  );
}

function PreviewInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition"
      />
    </label>
  );
}

async function copyText(
  text: string,
  successMessage: string,
  setMessage: (value: string) => void,
) {
  await navigator.clipboard.writeText(text);
  setMessage(successMessage);
}

function defaultTemplateFor(
  channel: Channel,
) {
  if (channel === 'sms') {
    return DEFAULT_SMS_TEMPLATE;
  }

  if (channel === 'whatsapp') {
    return DEFAULT_WHATSAPP_TEMPLATE;
  }

  return DEFAULT_EMAIL_TEMPLATE;
}

function renderTemplateWithSamples(
  template: string,
  samples: {
    customerName: string;
    storeName: string;
    checkoutLink: string;
    cartValue: string;
  },
) {
  return template
    .replaceAll(
      '{{customerName}}',
      samples.customerName,
    )
    .replaceAll(
      '{{checkoutLink}}',
      samples.checkoutLink,
    )
    .replaceAll(
      '{{storeName}}',
      samples.storeName,
    )
    .replaceAll(
      '{{cartValue}}',
      samples.cartValue,
    );
}

function activeChannelLabel(
  channel: Channel,
) {
  if (channel === 'sms') {
    return 'SMS';
  }

  if (channel === 'whatsapp') {
    return 'WhatsApp';
  }

  return 'Email';
}
