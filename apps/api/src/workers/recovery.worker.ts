import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { buildEmailHtml, getSmartOffer, type BuiltInTemplateId } from '../email/email-builder';

const prisma = new PrismaClient();

const redisConnection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null, enableReadyCheck: false },
);

function buildTransporter(store: any) {
  return nodemailer.createTransport({
    host:   store.owner?.smtpHost   || store.smtpHost   || process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   store.owner?.smtpPort   || store.smtpPort   || Number(process.env.SMTP_PORT) || 587,
    secure: store.owner?.smtpSecure ?? store.smtpSecure ?? (process.env.SMTP_SECURE === 'true'),
    auth: {
      user: store.owner?.smtpUser || store.smtpUser || process.env.SMTP_USER || '',
      pass: store.owner?.smtpPass || store.smtpPass || process.env.SMTP_PASS || '',
    },
    tls: { rejectUnauthorized: false },
  });
}

function alreadySentForStep(order: any, step: number): boolean {
  if (step === 1) return !!order.emailSentAt;
  if (step === 2) return !!order.emailStep2SentAt;
  if (step === 3) return !!order.emailStep3SentAt;
  return false;
}

function getSentAtField(step: number): string {
  if (step === 1) return 'emailSentAt';
  if (step === 2) return 'emailStep2SentAt';
  return 'emailStep3SentAt';
}

function getTemplateForStep(campaign: any, step: number, abVariant: string): { template: string | null; subject: string | null; templateId: BuiltInTemplateId } {
  const templateId: BuiltInTemplateId = (campaign?.templateId as BuiltInTemplateId) || 'classic';
  if (step === 2) return { template: campaign?.emailStep2Template || null, subject: campaign?.emailStep2Subject || null, templateId };
  if (step === 3) return { template: campaign?.emailStep3Template || null, subject: campaign?.emailStep3Subject || null, templateId };
  if (step === 1 && abVariant === 'B' && campaign?.abTestEnabled) {
    return { template: campaign?.abVariantBTemplate || campaign?.emailTemplate || null, subject: campaign?.abVariantBSubject || null, templateId };
  }
  return { template: campaign?.emailTemplate || null, subject: null, templateId };
}

const worker = new Worker(
  'recovery-email',
  async (job) => {
    const { orderId, step = 1 } = job.data;
    console.log(`📧 Processing email step ${step} for order:`, orderId);

    const order = await prisma.abandonedOrder.findUnique({
      where: { id: orderId },
      include: { store: { include: { owner: true, campaigns: { take: 1 } } } },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);
    if (!order.customerEmail) throw new Error(`Order ${orderId} has no customer email`);

    if (order.status === 'RECOVERED') {
      console.log(`⏭ Order ${orderId} already recovered, skipping step ${step}`);
      return;
    }

    if (alreadySentForStep(order, step)) {
      console.log(`⏭ Step ${step} already sent for ${orderId}, skipping`);
      return;
    }

    const campaign = order.store.campaigns?.[0];

    // A/B variant assignment (step 1 only)
    let abVariant = (order as any).abVariant || 'A';
    if (step === 1 && campaign?.abTestEnabled && !(order as any).abVariant) {
      abVariant = Math.random() < 0.5 ? 'A' : 'B';
      await prisma.abandonedOrder.update({ where: { id: orderId }, data: { abVariant } });
    }

    const cartItems  = Array.isArray(order.cartSnapshot) ? order.cartSnapshot as any[] : [];
    const cartValue  = Number(order.cartValue || 0);
    const storeUrl   = `https://${order.store.domain}`;
    const apiUrl     = process.env.API_URL || 'http://localhost:3001';
    const frontendUrl = process.env.FRONTEND_URL || '';
    const clickTrackUrl = `${apiUrl}/track/click/${order.id}?url=${encodeURIComponent(`${storeUrl}/cart?recover=${order.sessionId || order.externalOrderId}`)}`;
    const openPixelUrl  = `${apiUrl}/track/open/${order.id}.png`;

    const { template, subject: customSubject, templateId } = getTemplateForStep(campaign, step, abVariant);

    const html = buildEmailHtml({
      template,
      templateId,
      customerName: order.customerName,
      storeName:    order.store.name,
      storeUrl,
      cartValue,
      cartItems,
      recoveryLink: clickTrackUrl,
      step,
      frontendUrl,
    }) + `<img src="${openPixelUrl}" width="1" height="1" style="display:none" alt="">`;

    const offer     = getSmartOffer(cartValue, step);
    const firstName = order.customerName?.split(' ')[0] || 'there';

    const defaultSubjects: Record<number, string> = {
      1: `${firstName}, your cart is waiting — ${offer.badgeLabel} inside 🛒`,
      2: `${firstName}, still thinking? ${offer.badgeLabel} just for you ⏰`,
      3: `Last chance ${firstName} — your cart expires today 🚨`,
    };
    const subject = customSubject || defaultSubjects[step] || defaultSubjects[1];

    const transporter = buildTransporter(order.store);
    const fromAddr = order.store.owner?.smtpFrom || order.store.owner?.smtpUser ||
                     order.store.smtpFrom        || order.store.smtpUser        ||
                     process.env.SMTP_FROM        || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `"${order.store.name}" <${fromAddr}>`,
      to:   order.customerEmail,
      subject,
      html,
    });

    await prisma.abandonedOrder.update({
      where: { id: orderId },
      data:  { [getSentAtField(step)]: new Date(), status: 'DETECTED' },
    });

    console.log(`📧 Email step ${step} sent (variant ${abVariant}):`, info.messageId, '→', order.customerEmail);
  },
  { connection: redisConnection, concurrency: 3 },
);

worker.on('completed', (job) => console.log('✅ Email job done:', job?.id));
worker.on('failed',    (job, err) => console.error('❌ Email job failed:', job?.id, err.message));
