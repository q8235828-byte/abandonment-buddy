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
  createdAt: string;
  updatedAt: string;
  store?: Store;
};

export type DashboardStats = {
  abandonedCarts: number;
  messagesSent: number;
  recoveryRate: number;
  revenueRecovered: number;
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
  emailTemplate?: string | null;
  whatsappTemplate?: string | null;
  smsTemplate?: string | null;
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
  emailTemplate: string;
  whatsappTemplate: string;
  smsTemplate: string;
};

export type ApiError = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};
