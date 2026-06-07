import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const redisConnection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null, enableReadyCheck: false },
);

function buildTransporter(store: any) {
  const host = store.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = store.smtpPort || Number(process.env.SMTP_PORT) || 587;
  const secure = store.smtpSecure ?? (process.env.SMTP_SECURE === 'true');
  const user = store.smtpUser || process.env.SMTP_USER || '';
  const pass = store.smtpPass || process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

function buildEmailHtml(params: {
  customerName: string | null;
  cartItems: any[];
  cartValue: number | null;
  storeUrl?: string;
}) {
  const { customerName, cartItems, cartValue, storeUrl } = params;
  const name = customerName || 'there';
  const total = cartValue?.toFixed(2) ?? '0.00';
  const cartUrl = storeUrl ? `${storeUrl}/cart` : '#';

  const itemsHtml = Array.isArray(cartItems) && cartItems.length > 0
    ? cartItems.map((item: any) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
            ${item.image ? `<img src="${item.image}" width="48" height="48" style="border-radius:8px;vertical-align:middle;margin-right:12px;" alt="">` : ''}
            <span style="font-size:14px;color:#0f172a;font-weight:500;">${item.name ?? 'Product'}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b;font-size:13px;">×${item.quantity ?? 1}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#0f172a;font-size:14px;">$${(item.total ?? 0).toFixed(2)}</td>
        </tr>`)
      .join('')
    : `<tr><td colspan="3" style="padding:16px;color:#94a3b8;text-align:center;">Your cart items</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>You left something behind</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;font-size:13px;font-weight:700;letter-spacing:.08em;padding:6px 14px;border-radius:20px;text-transform:uppercase;">
                Abandonment Buddy
              </div>
              <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">Cart Recovery</p>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background:#fff;padding:36px 32px 24px;text-align:center;">
              <div style="font-size:48px;line-height:1;">🛒</div>
              <h1 style="margin:16px 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
                Hey ${name}, you left something!
              </h1>
              <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
                Your cart has been waiting patiently. Items are selling fast —<br>
                don't miss out before they're gone.
              </p>
            </td>
          </tr>

          <!-- Cart items -->
          <tr>
            <td style="background:#fff;padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Item</th>
                    <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Qty</th>
                    <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Price</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                  <tr style="background:#f8fafc;">
                    <td colspan="2" style="padding:12px 16px;font-weight:700;font-size:14px;color:#0f172a;">Total</td>
                    <td style="padding:12px 16px;text-align:right;font-weight:700;font-size:16px;color:#0f172a;">$${total}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#fff;padding:8px 32px 36px;text-align:center;">
              <a href="${cartUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;letter-spacing:.01em;">
                Complete My Purchase →
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
                This link takes you directly to your cart
              </p>
            </td>
          </tr>

          <!-- Urgency strip -->
          <tr>
            <td style="background:#fef9ec;border-top:1px solid #fde68a;border-bottom:1px solid #fde68a;padding:14px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                ⚡ <strong>Your cart is reserved for a limited time.</strong> Complete your order before items sell out.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">
                You received this email because you added items to your cart.<br>
                If you've already completed your purchase, please ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const worker = new Worker(
  'recovery-email',
  async (job) => {
    const { orderId } = job.data;
    console.log('📧 Processing recovery email for order:', orderId);

    const order = await prisma.abandonedOrder.findUnique({
      where: { id: orderId },
      include: { store: true },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);
    if (!order.customerEmail) throw new Error(`Order ${orderId} has no customer email`);
    if (order.emailSentAt) {
      console.log(`📧 Email already sent for order ${orderId}, skipping`);
      return;
    }
    if (!order.store.smtpUser && !process.env.SMTP_USER) {
      throw new Error(`Store ${order.store.id} has no email configured`);
    }

    const cartItems = Array.isArray(order.cartSnapshot) ? order.cartSnapshot : [];

    const html = buildEmailHtml({
      customerName: order.customerName,
      cartItems,
      cartValue: order.cartValue,
      storeUrl: order.store.domain ? `https://${order.store.domain}` : undefined,
    });

    const transporter = buildTransporter(order.store);

    const fromAddr = order.store.smtpFrom || order.store.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER;
    const info = await transporter.sendMail({
      from: `"${order.store.name || 'Your Store'}" <${fromAddr}>`,
      to: order.customerEmail,
      subject: `${order.customerName ? order.customerName.split(' ')[0] + ', you' : 'You'} left $${order.cartValue?.toFixed(2) ?? '0.00'} in your cart 🛒`,
      html,
    });

    await prisma.abandonedOrder.update({
      where: { id: orderId },
      data: { emailSentAt: new Date(), status: 'DETECTED' },
    });

    console.log('📧 Recovery email sent:', info.messageId, '→', order.customerEmail);
  },
  { connection: redisConnection, concurrency: 3 },
);

worker.on('completed', (job) => console.log('✅ Email job done:', job?.id));
worker.on('failed', (job, err) => console.error('❌ Email job failed:', job?.id, err.message));
