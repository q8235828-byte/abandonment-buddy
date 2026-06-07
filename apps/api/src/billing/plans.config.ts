export type PlanKey = 'FREE' | 'STARTER' | 'PRO';

export const PLANS: Record<PlanKey, {
  name: string;
  priceUsd: number;
  orders: number;   // -1 = unlimited
  emails: number;
  sms: number;
  whatsapp: number;
  description: string;
  features: string[];
}> = {
  FREE: {
    name: 'Free',
    priceUsd: 0,
    orders: 100,
    emails: 50,
    sms: 20,
    whatsapp: 20,
    description: 'Get started with basic cart recovery',
    features: [
      '100 orders tracked / month',
      '50 recovery emails / month',
      '20 SMS messages / month',
      '20 WhatsApp messages / month',
      'Basic email templates',
      'WooCommerce integration',
    ],
  },
  STARTER: {
    name: 'Starter',
    priceUsd: 20,
    orders: 1000,
    emails: 500,
    sms: 200,
    whatsapp: 200,
    description: 'For growing stores with more cart traffic',
    features: [
      '1,000 orders tracked / month',
      '500 recovery emails / month',
      '200 SMS messages / month',
      '200 WhatsApp messages / month',
      'Custom email templates',
      'Campaign scheduling',
      'Priority support',
    ],
  },
  PRO: {
    name: 'Pro',
    priceUsd: 50,
    orders: -1,
    emails: -1,
    sms: -1,
    whatsapp: -1,
    description: 'Unlimited recovery for high-volume stores',
    features: [
      'Unlimited orders tracked',
      'Unlimited recovery emails',
      'Unlimited SMS messages',
      'Unlimited WhatsApp messages',
      'Advanced analytics',
      'Multi-store management',
      'Dedicated support',
    ],
  },
};

export function isWithinLimit(used: number, limit: number): boolean {
  if (limit === -1) return true; // unlimited
  return used < limit;
}

export function usagePercent(used: number, limit: number): number {
  if (limit === -1) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}
