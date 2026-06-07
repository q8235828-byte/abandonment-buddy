import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const redisConnection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null, enableReadyCheck: false },
);

// ── Smart offer based on cart value ──────────────────────────────────────────
function getSmartOffer(cartValue: number) {
  if (cartValue >= 150) return { headline: '🎁 Exclusive 10% off — just for you', subline: 'Use code <strong>SAVE10</strong> at checkout for 10% off your entire order. Valid 24 hours only.', code: 'SAVE10', badgeLabel: '10% OFF', badgeColor: '#7c3aed' };
  if (cartValue >= 50)  return { headline: '💰 5% off to help you complete your order', subline: 'Use code <strong>COMEBACK5</strong> at checkout. Valid for the next 24 hours only.', code: 'COMEBACK5', badgeLabel: '5% OFF', badgeColor: '#0d9488' };
  return { headline: '🚚 Free shipping on your order!', subline: 'Use code <strong>FREESHIP</strong> at checkout to get free shipping.', code: 'FREESHIP', badgeLabel: 'FREE SHIP', badgeColor: '#0891b2' };
}

// ── Build cart items HTML ─────────────────────────────────────────────────────
function buildCartItemsHtml(items: any[]): string {
  if (!items?.length) return '<tr><td colspan="4" style="padding:16px;color:#94a3b8;text-align:center;font-size:13px;">Cart items</td></tr>';
  return items.map((item: any) => `
    <tr style="background:#ffffff;">
      <td style="padding:13px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">
        ${item.image ? `<img src="${item.image}" width="40" height="40" style="border-radius:6px;vertical-align:middle;margin-right:10px;" alt="">` : ''}
        ${item.name ?? 'Product'}
      </td>
      <td style="padding:13px 8px;text-align:center;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">×${item.quantity ?? 1}</td>
      <td style="padding:13px 12px;text-align:right;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">$${Number(item.price ?? 0).toFixed(2)}</td>
      <td style="padding:13px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;">$${Number(item.total ?? (item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}</td>
    </tr>`).join('');
}

// ── Fill campaign template or use built-in smart template ─────────────────────
function buildEmailHtml(params: {
  template: string | null;
  customerName: string | null;
  storeName: string;
  storeUrl: string;
  cartValue: number;
  cartItems: any[];
  recoveryLink: string;
}): string {
  const { template, customerName, storeName, storeUrl, cartValue, cartItems, recoveryLink } = params;
  const name = customerName || 'there';
  const offer = getSmartOffer(cartValue);

  const cartItemsHtml = `
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <thead>
    <tr style="background:#f8fafc;">
      <th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Product</th>
      <th style="padding:11px 8px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Qty</th>
      <th style="padding:11px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Price</th>
      <th style="padding:11px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Total</th>
    </tr>
  </thead>
  <tbody>${buildCartItemsHtml(cartItems)}</tbody>
</table>`;

  // If campaign has a custom template, fill it with tokens
  if (template && template.trim().startsWith('<')) {
    return template
      .replaceAll('{{customerName}}',    name)
      .replaceAll('{{storeName}}',       storeName)
      .replaceAll('{{storeUrl}}',        storeUrl)
      .replaceAll('{{cartValue}}',       `$${cartValue.toFixed(2)}`)
      .replaceAll('{{cartItems}}',       cartItemsHtml)
      .replaceAll('{{recoveryLink}}',    recoveryLink)
      .replaceAll('{{discountCode}}',    offer.code)
      .replaceAll('{{badgeLabel}}',      offer.badgeLabel)
      .replaceAll('{{badgeColor}}',      offer.badgeColor)
      .replaceAll('{{offerHeadline}}',   offer.headline)
      .replaceAll('{{offerSubline}}',    offer.subline)
      .replaceAll('{{unsubscribeLink}}', `${process.env.FRONTEND_URL || ''}/unsubscribe`);
  }

  // Built-in smart HTML email
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your cart is waiting — ${storeName}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,0.10);">

  <tr><td style="background:#0f172a;padding:28px 40px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">${storeName}</p>
    <p style="margin:6px 0 0;font-size:12px;color:#64748b;letter-spacing:.04em;">CART RECOVERY</p>
  </td></tr>

  <tr><td style="padding:36px 40px 20px;">
    <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.25;">Hey ${name}, you left something behind! 🛒</h1>
    <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">You added <strong style="color:#0f172a;">$${cartValue.toFixed(2)}</strong> worth of items to your cart at <strong style="color:#0f172a;">${storeName}</strong> but didn't complete checkout. No worries — we saved everything for you.</p>
  </td></tr>

  <tr><td style="padding:0 40px 8px;">
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Items in your cart</p>
    ${cartItemsHtml}
  </td></tr>

  <tr><td style="padding:8px 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 18px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
      <table width="100%">
        <tr><td style="font-size:14px;color:#64748b;">Cart subtotal</td><td align="right" style="font-size:18px;font-weight:800;color:#0f172a;">$${cartValue.toFixed(2)}</td></tr>
        <tr><td colspan="2" style="padding-top:4px;font-size:12px;color:#94a3b8;">Shipping &amp; taxes calculated at checkout</td></tr>
      </table>
    </td></tr></table>
  </td></tr>

  <tr><td style="padding:0 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:20px 22px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border-radius:12px;border:1px solid #bbf7d0;">
        <table width="100%"><tr>
          <td>
            <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#065f46;">${offer.headline}</p>
            <p style="margin:0 0 14px;font-size:13px;color:#047857;line-height:1.6;">${offer.subline}</p>
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:#065f46;color:#ffffff;font-size:14px;font-weight:800;padding:10px 22px;border-radius:8px;letter-spacing:.08em;">${offer.code}</td>
              <td style="padding-left:12px;font-size:12px;color:#64748b;">Copy &amp; paste at checkout</td>
            </tr></table>
          </td>
          <td width="80" valign="top" align="right">
            <div style="background:${offer.badgeColor};color:#ffffff;font-size:11px;font-weight:800;padding:5px 10px;border-radius:20px;text-align:center;white-space:nowrap;">${offer.badgeLabel}</div>
          </td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 40px 16px;" align="center">
    <a href="${recoveryLink}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 52px;border-radius:12px;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(13,148,136,0.35);">✅ Complete My Order →</a>
  </td></tr>

  <tr><td style="padding:0 40px 28px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Button not working? <a href="${recoveryLink}" style="color:#0d9488;">Click here to open your cart</a></p>
  </td></tr>

  <tr><td style="padding:0 40px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:20px 22px;background:#fafafa;border-radius:12px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0f172a;">Having trouble checking out?</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="50%" valign="top" style="padding-right:12px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;">💳 Payment declined?</p>
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">Try a different card, check your billing address, or use PayPal as an alternative.</p>
          </td>
          <td width="50%" valign="top" style="padding-left:12px;border-left:1px solid #e2e8f0;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;">🔄 Page not loading?</p>
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">Clear browser cookies or try a different browser. Your cart is saved — nothing will be lost.</p>
          </td>
        </tr>
        <tr><td colspan="2" style="padding-top:14px;">
          <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">Still stuck? Reply to this email — we'll help complete your order manually.</p>
        </td></tr></table>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 40px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:14px 18px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa;text-align:center;">
        <p style="margin:0;font-size:13px;color:#c2410c;line-height:1.5;">⏰ <strong>Your cart &amp; discount code expire in 24 hours.</strong> Complete checkout now before items sell out.</p>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">You received this because you added items to your cart at <a href="${storeUrl}" style="color:#0d9488;text-decoration:none;">${storeName}</a>. We never share your information.</p>
    <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;"><a href="${process.env.FRONTEND_URL || ''}/unsubscribe" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> &nbsp;·&nbsp; ${storeUrl}</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Build transporter from store settings ─────────────────────────────────────
function buildTransporter(store: any) {
  return nodemailer.createTransport({
    host:   store.owner?.smtpHost || store.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   store.owner?.smtpPort || store.smtpPort || Number(process.env.SMTP_PORT) || 587,
    secure: store.owner?.smtpSecure ?? store.smtpSecure ?? (process.env.SMTP_SECURE === 'true'),
    auth: {
      user: store.owner?.smtpUser || store.smtpUser || process.env.SMTP_USER || '',
      pass: store.owner?.smtpPass || store.smtpPass || process.env.SMTP_PASS || '',
    },
    tls: { rejectUnauthorized: false },
  });
}

// ── Worker ────────────────────────────────────────────────────────────────────
const worker = new Worker(
  'recovery-email',
  async (job) => {
    const { orderId } = job.data;
    console.log('📧 Processing recovery email for order:', orderId);

    const order = await prisma.abandonedOrder.findUnique({
      where: { id: orderId },
      include: {
        store: {
          include: { owner: true, campaigns: { take: 1 } },
        },
      },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);
    if (!order.customerEmail) throw new Error(`Order ${orderId} has no customer email`);
    if (order.emailSentAt) { console.log(`📧 Already sent for ${orderId}, skipping`); return; }

    const campaign = order.store.campaigns?.[0];
    const cartItems = Array.isArray(order.cartSnapshot) ? order.cartSnapshot as any[] : [];
    const cartValue = Number(order.cartValue || 0);
    const storeUrl = `https://${order.store.domain}`;
    const recoveryLink = `${storeUrl}/cart?recover=${order.sessionId || order.externalOrderId}`;

    const html = buildEmailHtml({
      template:     campaign?.emailTemplate || null,
      customerName: order.customerName,
      storeName:    order.store.name,
      storeUrl,
      cartValue,
      cartItems,
      recoveryLink,
    });

    const offer = getSmartOffer(cartValue);
    const firstName = order.customerName?.split(' ')[0] || 'there';
    const subject = `${firstName}, your cart is waiting — ${offer.badgeLabel} inside 🛒`;

    const transporter = buildTransporter(order.store);
    const fromAddr = order.store.owner?.smtpFrom || order.store.owner?.smtpUser ||
                     order.store.smtpFrom || order.store.smtpUser ||
                     process.env.SMTP_FROM || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `"${order.store.name}" <${fromAddr}>`,
      to:   order.customerEmail,
      subject,
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
worker.on('failed',    (job, err) => console.error('❌ Email job failed:', job?.id, err.message));
