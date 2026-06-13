export type User = {
  id: string;
  email: string;
  fullName?: string | null;
};

export type Store = {
  id: string;
  name: string;
  domain: string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  abandonmentTimeoutMin: number;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpFrom?: string | null;
  smtpSecure?: boolean | null;
  smtpVerified?: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
  image?: string;
};

export type AbandonedOrder = {
  id: string;
  externalOrderId: string;
  sessionId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  cartValue?: number | null;
  cartSnapshot?: CartItem[] | null;
  orderStatus?: string | null;
  isAbandoned: boolean;
  status: 'DETECTED' | 'RECOVERED' | 'EXPIRED';
  abandonedAt?: string | null;
  recoveredAt?: string | null;
  emailSentAt?: string | null;
  emailStep2SentAt?: string | null;
  emailStep3SentAt?: string | null;
  whatsappSentAt?: string | null;
  smsSentAt?: string | null;
  abVariant?: 'A' | 'B' | null;
  emailOpenedAt?: string | null;
  emailClickedAt?: string | null;
  recoveredBy?: 'EMAIL' | 'WHATSAPP' | 'SMS' | null;
  recoveredByStep?: number | null;
  createdAt: string;
  updatedAt: string;
  store?: Store;
};

export type DashboardStats = {
  // Core
  abandonedCarts: number;
  messagesSent: number;
  recoveryRate: number;
  revenueRecovered: number;
  // Per-channel
  emailSent: number;
  whatsappSent: number;
  smsSent: number;
  emailRecovered: number;
  whatsappRecovered: number;
  smsRecovered: number;
  // Sequence funnel
  step1Sent: number;
  step2Sent: number;
  step3Sent: number;
  // A/B testing
  abVariantASent: number;
  abVariantBSent: number;
  abVariantARecovered: number;
  abVariantBRecovered: number;
  // Email engagement
  emailOpened: number;
  emailClicked: number;
  // Time series
  dailyRevenue: { date: string; revenue: number; recovered: number }[];
};

export type Campaign = {
  id: string;
  storeId: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailDelayMin: number;
  whatsappDelayMin: number;
  smsDelayMin: number;
  templateId?: string | null;
  emailTemplate?: string | null;
  whatsappTemplate?: string | null;
  smsTemplate?: string | null;
  // Step 2
  emailStep2DelayMin?: number | null;
  emailStep2Subject?: string | null;
  emailStep2Template?: string | null;
  // Step 3
  emailStep3DelayMin?: number | null;
  emailStep3Subject?: string | null;
  emailStep3Template?: string | null;
  // A/B
  abTestEnabled?: boolean;
  abVariantBSubject?: string | null;
  abVariantBTemplate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignPayload = {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailDelayMin: number;
  whatsappDelayMin: number;
  smsDelayMin: number;
  templateId?: string;
  emailTemplate: string;
  whatsappTemplate: string;
  smsTemplate: string;
  emailStep2DelayMin?: number;
  emailStep2Subject?: string;
  emailStep2Template?: string;
  emailStep3DelayMin?: number;
  emailStep3Subject?: string;
  emailStep3Template?: string;
  abTestEnabled?: boolean;
  abVariantBSubject?: string;
  abVariantBTemplate?: string;
};

export type ApiError = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};
