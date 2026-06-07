import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class StoresService {
constructor(
private prisma: PrismaService,
) {}

async createStore(
userId: string,
dto: any,
) {
const existingStore =
await this.prisma.store.findUnique({
where: {
domain: dto.domain,
},
});

if (existingStore) {
  throw new BadRequestException(
    'Store already exists',
  );
}

const apiKey =
  'ck_' +
  randomBytes(24).toString('hex');

const apiSecret =
  'cs_' +
  randomBytes(32).toString('hex');

const webhookSecret =
  randomBytes(32).toString('hex');

return this.prisma.store.create({
  data: {
    name: dto.name,
    domain: dto.domain,
    apiKey,
    apiSecret,
    webhookSecret,
    ownerId: userId,
  },
});

}

async getStores(
userId: string,
) {
return this.prisma.store.findMany({
where: {
ownerId: userId,
},
});
}

async updateEmailSettings(storeId: string, userId: string, dto: any) {
  const store = await this.prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
  });
  if (!store) throw new BadRequestException('Store not found');

  const data: any = {
    smtpHost: dto.smtpHost,
    smtpPort: Number(dto.smtpPort) || 587,
    smtpUser: dto.smtpUser,
    smtpFrom: dto.smtpFrom || dto.smtpUser,
    smtpSecure: dto.smtpSecure === true || dto.smtpSecure === 'true',
    smtpVerified: false,
  };
  if (dto.smtpPass) data.smtpPass = dto.smtpPass;

  return this.prisma.store.update({
    where: { id: storeId },
    data,
    select: {
      id: true, smtpHost: true, smtpPort: true,
      smtpUser: true, smtpFrom: true, smtpSecure: true, smtpVerified: true,
    },
  });
}

async testEmailSettings(storeId: string, userId: string) {
  const store = await this.prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
    include: {
      owner: true,
      campaigns: { take: 1 },
      abandonedOrders: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  if (!store) throw new BadRequestException('Store not found');

  // Pick SMTP from store owner settings or store-level settings
  const smtpHost = store.owner?.smtpHost || store.smtpHost;
  const smtpUser = store.owner?.smtpUser || store.smtpUser;
  const smtpPass = store.owner?.smtpPass || store.smtpPass;
  const smtpPort = store.owner?.smtpPort || store.smtpPort || 587;
  const smtpSecure = store.owner?.smtpSecure ?? store.smtpSecure ?? false;
  const smtpFrom = store.owner?.smtpFrom || store.smtpFrom || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new BadRequestException('Email settings not configured. Go to Settings → Email and add your SMTP credentials.');
  }

  // Use real order data if available, otherwise use sample data
  const latestOrder = store.abandonedOrders?.[0];
  const cartItems = Array.isArray(latestOrder?.cartSnapshot) ? latestOrder.cartSnapshot as any[] : [
    { name: 'Sample Product A', quantity: 2, price: 29.99, total: 59.98 },
    { name: 'Sample Product B', quantity: 1, price: 14.99, total: 14.99 },
  ];
  const cartValue = latestOrder ? Number(latestOrder.cartValue || 74.97) : 74.97;
  const customerName = latestOrder?.customerName || 'Test Customer';
  const storeUrl = `https://${store.domain}`;
  const recoveryLink = `${storeUrl}/cart?recover=test-preview`;

  // Build smart offer
  const getSmartOffer = (v: number) => {
    if (v >= 150) return { headline: '🎁 Exclusive 10% off — just for you', subline: 'Use code <strong>SAVE10</strong> at checkout for 10% off.', code: 'SAVE10', badgeLabel: '10% OFF', badgeColor: '#7c3aed' };
    if (v >= 50)  return { headline: '💰 5% off to help you complete your order', subline: 'Use code <strong>COMEBACK5</strong> at checkout.', code: 'COMEBACK5', badgeLabel: '5% OFF', badgeColor: '#0d9488' };
    return { headline: '🚚 Free shipping on your order!', subline: 'Use code <strong>FREESHIP</strong> at checkout.', code: 'FREESHIP', badgeLabel: 'FREE SHIP', badgeColor: '#0891b2' };
  };
  const offer = getSmartOffer(cartValue);

  const itemsHtml = cartItems.map((item: any) => `
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">
        ${item.image ? `<img src="${item.image}" width="36" height="36" style="border-radius:6px;vertical-align:middle;margin-right:8px;" alt="">` : ''}${item.name}
      </td>
      <td style="padding:12px 8px;text-align:center;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">×${item.quantity}</td>
      <td style="padding:12px 16px;text-align:right;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">$${Number(item.price||0).toFixed(2)}</td>
      <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;">$${Number(item.total||(item.price*item.quantity)||0).toFixed(2)}</td>
    </tr>`).join('');

  const cartTable = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <thead><tr style="background:#f8fafc;">
      <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Product</th>
      <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Qty</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Price</th>
      <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Total</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>`;

  // Fill campaign template or use built-in
  const campaign = store.campaigns?.[0];
  let html: string;
  if (campaign?.emailTemplate && campaign.emailTemplate.trim().startsWith('<')) {
    html = campaign.emailTemplate
      .replaceAll('{{customerName}}',    customerName)
      .replaceAll('{{storeName}}',       store.name)
      .replaceAll('{{storeUrl}}',        storeUrl)
      .replaceAll('{{cartValue}}',       `$${cartValue.toFixed(2)}`)
      .replaceAll('{{cartItems}}',       cartTable)
      .replaceAll('{{recoveryLink}}',    recoveryLink)
      .replaceAll('{{discountCode}}',    offer.code)
      .replaceAll('{{badgeLabel}}',      offer.badgeLabel)
      .replaceAll('{{badgeColor}}',      offer.badgeColor)
      .replaceAll('{{offerHeadline}}',   offer.headline)
      .replaceAll('{{offerSubline}}',    offer.subline)
      .replaceAll('{{unsubscribeLink}}', `${process.env.FRONTEND_URL || ''}/unsubscribe`);
  } else {
    html = `<p>Hi ${customerName},</p><p>This is a test from <strong>${store.name}</strong>. Your recovery emails are configured and working!</p><p>Cart value: $${cartValue.toFixed(2)}</p>`;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost, port: smtpPort, secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  });

  const info = await transporter.sendMail({
    from: `"${store.name}" <${smtpFrom}>`,
    to: smtpUser,
    subject: `[TEST] ${customerName.split(' ')[0]}, your cart is waiting — ${offer.badgeLabel} inside 🛒`,
    html,
  });

  await this.prisma.store.update({ where: { id: storeId }, data: { smtpVerified: true } });
  return { success: true, messageId: info.messageId, sentTo: smtpUser, usedRealOrder: !!latestOrder };
}

async connectStore(
dto: any,
) {
console.log(
'Incoming DTO:',
dto,
);

const allStores =
  await this.prisma.store.findMany();

console.log(
  'All Stores:',
  allStores,
);

const store =
  await this.prisma.store.findFirst({
    where: {
      apiKey:
        dto.apiKey?.trim(),

      apiSecret:
        dto.apiSecret?.trim(),
    },
  });

console.log(
  'Matched Store:',
  store,
);

if (!store) {
  throw new BadRequestException(
    'Invalid API credentials',
  );
}

const updatedStore =
  await this.prisma.store.update({
    where: {
      id: store.id,
    },

    data: {
      status:
        'CONNECTED',
    },
  });

return {
  message: 'Store connected successfully',
  storeId: updatedStore.id,
  webhookSecret: updatedStore.webhookSecret,
  status: updatedStore.status,
};

}
}