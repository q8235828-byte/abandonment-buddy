import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { buildEmailHtml, type BuiltInTemplateId } from '../email/email-builder';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async createStore(userId: string, dto: any) {
    const existingStore = await this.prisma.store.findUnique({ where: { domain: dto.domain } });
    if (existingStore) throw new BadRequestException('Store already exists');

    const apiKey       = 'ck_' + randomBytes(24).toString('hex');
    const apiSecret    = 'cs_' + randomBytes(32).toString('hex');
    const webhookSecret = randomBytes(32).toString('hex');

    return this.prisma.store.create({
      data: { name: dto.name, domain: dto.domain, apiKey, apiSecret, webhookSecret, ownerId: userId },
    });
  }

  async getStores(userId: string) {
    return this.prisma.store.findMany({ where: { ownerId: userId } });
  }

  async updateEmailSettings(storeId: string, userId: string, dto: any) {
    const store = await this.prisma.store.findFirst({ where: { id: storeId, ownerId: userId } });
    if (!store) throw new BadRequestException('Store not found');

    const data: any = {
      smtpHost:   dto.smtpHost,
      smtpPort:   Number(dto.smtpPort) || 587,
      smtpUser:   dto.smtpUser,
      smtpFrom:   dto.smtpFrom || dto.smtpUser,
      smtpSecure: dto.smtpSecure === true || dto.smtpSecure === 'true',
      smtpVerified: false,
    };
    if (dto.smtpPass) data.smtpPass = dto.smtpPass;

    return this.prisma.store.update({
      where: { id: storeId },
      data,
      select: { id: true, smtpHost: true, smtpPort: true, smtpUser: true, smtpFrom: true, smtpSecure: true, smtpVerified: true },
    });
  }

  async testEmailSettings(storeId: string, userId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, ownerId: userId },
      include: {
        owner: true,
        campaigns: { take: 1 },
        abandonedOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!store) throw new BadRequestException('Store not found');

    // Resolve SMTP credentials: store-level first, fall back to account-level, then env
    const smtpHost   = store.smtpHost   || store.owner?.smtpHost   || process.env.SMTP_HOST;
    const smtpUser   = store.smtpUser   || store.owner?.smtpUser   || process.env.SMTP_USER;
    const smtpPass   = store.smtpPass   || store.owner?.smtpPass   || process.env.SMTP_PASS;
    const smtpPort   = store.smtpPort   || store.owner?.smtpPort   || Number(process.env.SMTP_PORT) || 587;
    const smtpSecure = store.smtpSecure ?? store.owner?.smtpSecure ?? (process.env.SMTP_SECURE === 'true');
    const smtpFrom   = store.smtpFrom   || store.owner?.smtpFrom   || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new BadRequestException(
        'Email settings not configured. Go to Settings → Email and add your SMTP credentials.',
      );
    }

    // Use real order data if available, otherwise sample data
    const latestOrder = store.abandonedOrders?.[0];
    const cartItems = Array.isArray(latestOrder?.cartSnapshot) ? latestOrder.cartSnapshot as any[] : [
      { name: 'Premium Wireless Headphones', quantity: 1, price: 59.99, total: 59.99 },
      { name: 'USB-C Charging Cable 3-pack', quantity: 2, price: 12.25, total: 24.50 },
    ];
    const cartValue    = latestOrder ? Number(latestOrder.cartValue || 84.49) : 84.49;
    const customerName = latestOrder?.customerName || 'Test Customer';

    const campaign    = store.campaigns?.[0];
    const storeUrl    = `https://${store.domain}`;
    const recoveryLink = `${storeUrl}/cart?recover=test-preview-${Date.now()}`;
    const frontendUrl  = process.env.FRONTEND_URL || 'https://app.abandonmentbuddy.com';

    const html = buildEmailHtml({
      template:    campaign?.emailTemplate || null,
      templateId:  ((campaign as any)?.templateId as BuiltInTemplateId) || 'classic',
      customerName,
      storeName:   store.name,
      storeUrl,
      cartValue,
      cartItems,
      recoveryLink,
      step:        1,
      frontendUrl,
    });

    const transporter = nodemailer.createTransport({
      host: smtpHost, port: smtpPort, secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    });

    const firstName = customerName.split(' ')[0];
    const info = await transporter.sendMail({
      from:    `"${store.name}" <${smtpFrom}>`,
      to:      smtpUser,
      subject: `[TEST] ${firstName}, your cart is waiting — see how your email looks 🛒`,
      html,
    });

    await this.prisma.store.update({ where: { id: storeId }, data: { smtpVerified: true } });
    return { success: true, messageId: info.messageId, sentTo: smtpUser, usedRealOrder: !!latestOrder };
  }

  async connectStore(dto: any) {
    const store = await this.prisma.store.findFirst({
      where: { apiKey: dto.apiKey?.trim(), apiSecret: dto.apiSecret?.trim() },
    });
    if (!store) throw new BadRequestException('Invalid API credentials');

    const updatedStore = await this.prisma.store.update({
      where: { id: store.id },
      data:  { status: 'CONNECTED' },
    });

    return {
      message:       'Store connected successfully',
      storeId:       updatedStore.id,
      webhookSecret: updatedStore.webhookSecret,
      status:        updatedStore.status,
    };
  }
}
