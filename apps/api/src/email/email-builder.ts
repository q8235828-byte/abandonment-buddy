// Shared email builder — used by recovery.worker.ts and stores.service.ts
// Keep this as a plain module (no NestJS decorators) so the standalone worker can import it.

export interface CartItem {
  name: string;
  quantity: number;
  price: number;
  total?: number;
  image?: string;
}

export interface SmartOffer {
  headline: string;
  subline: string;
  code: string;
  badgeLabel: string;
  badgeColor: string;
}

// ── Smart offer ───────────────────────────────────────────────────────────────
export function getSmartOffer(cartValue: number, step = 1): SmartOffer {
  if (step >= 2) {
    if (cartValue >= 150) return { headline: '🎁 Last chance — 15% off your order', subline: 'Use code <strong>SAVE15</strong> at checkout. This is your final reminder — offer expires today!', code: 'SAVE15', badgeLabel: '15% OFF', badgeColor: '#7c3aed' };
    if (cartValue >= 50)  return { headline: '💰 Final offer — 10% off just for you', subline: "Use code <strong>SAVE10</strong> at checkout. This offer won't be extended.", code: 'SAVE10', badgeLabel: '10% OFF', badgeColor: '#0d9488' };
    return { headline: '🚚 Free shipping + free returns', subline: 'Use code <strong>FREESHIP</strong> at checkout. Final offer — don\'t miss out!', code: 'FREESHIP', badgeLabel: 'FREE SHIP', badgeColor: '#0891b2' };
  }
  if (cartValue >= 150) return { headline: '🎁 Exclusive 10% off — just for you', subline: 'Use code <strong>SAVE10</strong> at checkout for 10% off your entire order. Valid 24 hours only.', code: 'SAVE10', badgeLabel: '10% OFF', badgeColor: '#7c3aed' };
  if (cartValue >= 50)  return { headline: '💰 5% off to help you complete your order', subline: 'Use code <strong>COMEBACK5</strong> at checkout. Valid for the next 24 hours only.', code: 'COMEBACK5', badgeLabel: '5% OFF', badgeColor: '#0d9488' };
  return { headline: '🚚 Free shipping on your order!', subline: 'Use code <strong>FREESHIP</strong> at checkout to get free shipping.', code: 'FREESHIP', badgeLabel: 'FREE SHIP', badgeColor: '#0891b2' };
}

// ── Cart items HTML ───────────────────────────────────────────────────────────
export function buildCartItemsHtml(items: CartItem[]): string {
  if (!items?.length) return '<tr><td colspan="4" style="padding:16px;color:#94a3b8;text-align:center;font-size:13px;">Cart items</td></tr>';
  return items.map((item) => `
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

export function buildCartTable(items: CartItem[]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <thead>
    <tr style="background:#f8fafc;">
      <th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Product</th>
      <th style="padding:11px 8px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Qty</th>
      <th style="padding:11px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Price</th>
      <th style="padding:11px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Total</th>
    </tr>
  </thead>
  <tbody>${buildCartItemsHtml(items)}</tbody>
</table>`;
}

// ── Fill a custom template with tokens ────────────────────────────────────────
export function fillTemplate(template: string, params: {
  customerName: string; storeName: string; storeUrl: string;
  cartValue: number; cartItems: CartItem[]; recoveryLink: string;
  offer: SmartOffer; frontendUrl: string;
}): string {
  const { customerName, storeName, storeUrl, cartValue, cartItems, recoveryLink, offer, frontendUrl } = params;
  return template
    .replaceAll('{{customerName}}',    customerName)
    .replaceAll('{{storeName}}',       storeName)
    .replaceAll('{{storeUrl}}',        storeUrl)
    .replaceAll('{{cartValue}}',       `$${cartValue.toFixed(2)}`)
    .replaceAll('{{cartItems}}',       buildCartTable(cartItems))
    .replaceAll('{{recoveryLink}}',    recoveryLink)
    .replaceAll('{{discountCode}}',    offer.code)
    .replaceAll('{{badgeLabel}}',      offer.badgeLabel)
    .replaceAll('{{badgeColor}}',      offer.badgeColor)
    .replaceAll('{{offerHeadline}}',   offer.headline)
    .replaceAll('{{offerSubline}}',    offer.subline)
    .replaceAll('{{unsubscribeLink}}', `${frontendUrl}/unsubscribe`);
}

// ── Built-in email templates ──────────────────────────────────────────────────

/** Template 1 — Classic (dark header, teal CTA) */
export function buildClassicEmail(p: {
  customerName: string; storeName: string; storeUrl: string;
  cartValue: number; cartItems: CartItem[]; recoveryLink: string;
  step: number; frontendUrl: string;
}): string {
  const { customerName, storeName, storeUrl, cartValue, cartItems, recoveryLink, step, frontendUrl } = p;
  const offer = getSmartOffer(cartValue, step);
  const cartTable = buildCartTable(cartItems);
  const name = customerName || 'there';
  const stepHeadlines: Record<number, string> = {
    1: `Hey ${name}, you left something behind! 🛒`,
    2: `${name}, your cart is still waiting ⏰`,
    3: `Last chance, ${name} — your cart expires today! 🚨`,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your cart is waiting — ${storeName}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,0.10);">
  <tr><td style="background:#0f172a;padding:28px 40px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">${storeName}</p>
    <p style="margin:6px 0 0;font-size:12px;color:#64748b;letter-spacing:.04em;">CART RECOVERY${step > 1 ? ` · REMINDER ${step}` : ''}</p>
  </td></tr>
  <tr><td style="padding:36px 40px 20px;">
    <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.25;">${stepHeadlines[step] ?? stepHeadlines[1]}</h1>
    <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">You added <strong style="color:#0f172a;">$${cartValue.toFixed(2)}</strong> worth of items to your cart at <strong style="color:#0f172a;">${storeName}</strong> but didn't complete checkout. No worries — we saved everything for you.</p>
  </td></tr>
  <tr><td style="padding:0 40px 8px;">
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Items in your cart</p>
    ${cartTable}
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
    <a href="${recoveryLink}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 52px;border-radius:12px;box-shadow:0 4px 14px rgba(13,148,136,0.35);">✅ Complete My Order →</a>
  </td></tr>
  <tr><td style="padding:0 40px 28px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Button not working? <a href="${recoveryLink}" style="color:#0d9488;">Click here to open your cart</a></p>
  </td></tr>
  <tr><td style="padding:0 40px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:14px 18px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa;text-align:center;">
        <p style="margin:0;font-size:13px;color:#c2410c;line-height:1.5;">⏰ <strong>${step >= 3 ? 'This is your FINAL reminder. Your cart expires today.' : 'Your cart &amp; discount code expire in 24 hours.'}</strong></p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">You received this because you added items to your cart at <a href="${storeUrl}" style="color:#0d9488;text-decoration:none;">${storeName}</a>.</p>
    <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;"><a href="${frontendUrl}/unsubscribe" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> &nbsp;·&nbsp; ${storeUrl}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Template 2 — Minimal (clean white, no heavy header) */
export function buildMinimalEmail(p: {
  customerName: string; storeName: string; storeUrl: string;
  cartValue: number; cartItems: CartItem[]; recoveryLink: string;
  step: number; frontendUrl: string;
}): string {
  const { customerName, storeName, storeUrl, cartValue, cartItems, recoveryLink, step, frontendUrl } = p;
  const offer = getSmartOffer(cartValue, step);
  const cartTable = buildCartTable(cartItems);
  const name = customerName || 'there';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your cart is waiting</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:48px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td style="padding-bottom:32px;border-bottom:2px solid #0f172a;">
    <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;letter-spacing:.12em;text-transform:uppercase;font-family:-apple-system,sans-serif;">${storeName}</p>
  </td></tr>
  <tr><td style="padding:40px 0 24px;">
    <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;font-family:-apple-system,sans-serif;">Hi ${name},</p>
    <h1 style="margin:0 0 20px;font-size:32px;font-weight:normal;color:#0f172a;line-height:1.3;">${step >= 3 ? 'Last chance before your cart expires.' : step === 2 ? 'Still thinking it over?' : 'You left something in your cart.'}</h1>
    <p style="margin:0;font-size:16px;color:#475569;line-height:1.75;font-family:-apple-system,sans-serif;">Your cart of <strong style="color:#0f172a;">$${cartValue.toFixed(2)}</strong> at ${storeName} is saved and ready for you. We'd hate for you to miss out.</p>
  </td></tr>
  <tr><td style="padding-bottom:32px;">${cartTable}</td></tr>
  <tr><td style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px;">
    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0f172a;font-family:-apple-system,sans-serif;">${offer.headline}</p>
    <p style="margin:0 0 16px;font-size:13px;color:#64748b;font-family:-apple-system,sans-serif;">${offer.subline}</p>
    <span style="display:inline-block;background:#0f172a;color:#ffffff;font-size:13px;font-weight:700;padding:8px 18px;border-radius:4px;letter-spacing:.06em;font-family:-apple-system,sans-serif;">${offer.code}</span>
  </td></tr>
  <tr><td style="padding:32px 0;" align="center">
    <a href="${recoveryLink}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:16px 48px;border-radius:4px;letter-spacing:.02em;font-family:-apple-system,sans-serif;">Complete your order →</a>
  </td></tr>
  <tr><td style="padding-top:32px;border-top:1px solid #f1f5f9;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;font-family:-apple-system,sans-serif;line-height:1.7;">
      You're receiving this because you shopped at <a href="${storeUrl}" style="color:#64748b;">${storeName}</a>. &nbsp;
      <a href="${frontendUrl}/unsubscribe" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Template 3 — Urgent/Bold (high contrast, red urgency, aggressive CTA) */
export function buildUrgentEmail(p: {
  customerName: string; storeName: string; storeUrl: string;
  cartValue: number; cartItems: CartItem[]; recoveryLink: string;
  step: number; frontendUrl: string;
}): string {
  const { customerName, storeName, storeUrl, cartValue, cartItems, recoveryLink, step, frontendUrl } = p;
  const offer = getSmartOffer(cartValue, step);
  const cartTable = buildCartTable(cartItems);
  const name = customerName || 'there';
  const urgencyHours = step >= 3 ? 2 : step === 2 ? 12 : 24;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>⚠️ Your cart expires in ${urgencyHours}h</title></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:24px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <tr><td style="background:#dc2626;padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:15px;font-weight:800;color:#ffffff;letter-spacing:.04em;">⚠️ CART EXPIRING IN ${urgencyHours} HOURS — ACT NOW</p>
  </td></tr>
  <tr><td style="padding:32px 40px 24px;">
    <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">${storeName}</p>
    <h1 style="margin:0 0 16px;font-size:30px;font-weight:900;color:#0f172a;line-height:1.2;">
      ${name}, your $${cartValue.toFixed(2)} cart is about to expire!
    </h1>
    <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">Items in your cart are in high demand. <strong style="color:#dc2626;">Don't let someone else take them.</strong> Complete checkout before time runs out.</p>
  </td></tr>
  <tr><td style="padding:0 40px 24px;">${cartTable}</td></tr>
  <tr><td style="padding:0 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:20px 24px;background:#fff1f2;border:2px solid #fecdd3;border-radius:10px;text-align:center;">
        <p style="margin:0 0 8px;font-size:18px;font-weight:900;color:#dc2626;">${offer.headline}</p>
        <p style="margin:0 0 16px;font-size:13px;color:#9f1239;">${offer.subline}</p>
        <table cellpadding="0" cellspacing="0" align="center"><tr>
          <td style="background:#dc2626;color:#ffffff;font-size:16px;font-weight:900;padding:12px 28px;border-radius:8px;letter-spacing:.1em;">${offer.code}</td>
        </tr></table>
        <p style="margin:10px 0 0;font-size:12px;color:#f43f5e;font-weight:600;">⏰ Expires in ${urgencyHours} hours</p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:0 40px 32px;" align="center">
    <a href="${recoveryLink}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-size:17px;font-weight:900;padding:18px 56px;border-radius:10px;box-shadow:0 4px 20px rgba(220,38,38,0.4);letter-spacing:.02em;">🛒 COMPLETE MY ORDER NOW →</a>
    <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Button not working? <a href="${recoveryLink}" style="color:#dc2626;">Click here</a></p>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#fef2f2;border-top:2px solid #fecdd3;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9f1239;font-weight:600;">⚠️ Items are not reserved until checkout is complete. Don't risk losing them!</p>
  </td></tr>
  <tr><td style="padding:16px 40px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.7;">You received this because you shopped at <a href="${storeUrl}" style="color:#64748b;">${storeName}</a>. &nbsp; <a href="${frontendUrl}/unsubscribe" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Template 4 — Friendly (warm, personal, emoji-rich) */
export function buildFriendlyEmail(p: {
  customerName: string; storeName: string; storeUrl: string;
  cartValue: number; cartItems: CartItem[]; recoveryLink: string;
  step: number; frontendUrl: string;
}): string {
  const { customerName, storeName, storeUrl, cartValue, cartItems, recoveryLink, step, frontendUrl } = p;
  const offer = getSmartOffer(cartValue, step);
  const cartTable = buildCartTable(cartItems);
  const name = customerName || 'there';
  const greetings = ['Hey', 'Hi', 'Hello'];
  const greeting = greetings[0];

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>We saved your cart 💛</title></head>
<body style="margin:0;padding:0;background:#fffbeb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;padding:32px 16px;"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #fde68a;">
  <tr><td style="padding:32px 40px 24px;text-align:center;background:linear-gradient(135deg,#fef9c3 0%,#fef3c7 100%);">
    <p style="margin:0;font-size:40px;line-height:1;">🛍️</p>
    <p style="margin:8px 0 4px;font-size:22px;font-weight:800;color:#92400e;">${storeName}</p>
    <p style="margin:0;font-size:14px;color:#b45309;">Psst… we saved something for you!</p>
  </td></tr>
  <tr><td style="padding:32px 40px 24px;">
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#1c1917;line-height:1.3;">
      ${greeting} ${name}! 👋 ${step >= 3 ? "It's now or never — your cart expires today." : step === 2 ? "We're still holding your cart for you 💛" : "You forgot something awesome!"}
    </h1>
    <p style="margin:0;font-size:15px;color:#57534e;line-height:1.8;">
      We noticed you left <strong style="color:#1c1917;">$${cartValue.toFixed(2)}</strong> worth of great stuff in your cart. We've been holding it for you, but ${step >= 3 ? "this is the last time we'll reach out." : "we can't hold it forever! 😅"}
    </p>
  </td></tr>
  <tr><td style="padding:0 40px 24px;">${cartTable}</td></tr>
  <tr><td style="padding:0 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:22px 24px;background:linear-gradient(135deg,#fef9c3 0%,#fef3c7 100%);border-radius:16px;border:2px solid #fde68a;">
        <p style="margin:0 0 4px;font-size:20px;">🎁</p>
        <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:#92400e;">${offer.headline}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#78350f;line-height:1.6;">${offer.subline}</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#d97706;color:#ffffff;font-size:15px;font-weight:800;padding:11px 24px;border-radius:10px;letter-spacing:.06em;">${offer.code}</td>
          <td style="padding-left:12px;font-size:12px;color:#92400e;">Use at checkout ✓</td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:0 40px 12px;" align="center">
    <a href="${recoveryLink}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#ffffff;text-decoration:none;font-size:17px;font-weight:800;padding:18px 52px;border-radius:50px;box-shadow:0 4px 20px rgba(245,158,11,0.4);">Grab My Cart 🛒</a>
  </td></tr>
  <tr><td style="padding:8px 40px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#a8a29e;">Button not working? <a href="${recoveryLink}" style="color:#d97706;">Click here</a></p>
  </td></tr>
  <tr><td style="padding:0 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:18px 20px;background:#fafaf9;border-radius:12px;border:1px solid #e7e5e4;text-align:center;">
        <p style="margin:0;font-size:13px;color:#78716c;line-height:1.6;">Having trouble? 💬 Just reply to this email and a real human will help you out. We love helping our customers!</p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:20px 40px;border-top:1px solid #fde68a;text-align:center;">
    <p style="margin:0;font-size:11px;color:#a8a29e;line-height:1.7;">You're getting this because you shopped at <a href="${storeUrl}" style="color:#b45309;">${storeName}</a>. We promise not to spam you! &nbsp; <a href="${frontendUrl}/unsubscribe" style="color:#a8a29e;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ── Main entry point ──────────────────────────────────────────────────────────
export type BuiltInTemplateId = 'classic' | 'minimal' | 'urgent' | 'friendly';

export function buildEmailHtml(params: {
  template: string | null;       // custom HTML template (null → use built-in)
  templateId?: BuiltInTemplateId; // which built-in to use (default: 'classic')
  customerName: string | null;
  storeName: string;
  storeUrl: string;
  cartValue: number;
  cartItems: CartItem[];
  recoveryLink: string;
  step?: number;
  frontendUrl?: string;
}): string {
  const {
    template, templateId = 'classic',
    customerName, storeName, storeUrl,
    cartValue, cartItems, recoveryLink,
    step = 1, frontendUrl = process.env.FRONTEND_URL || '',
  } = params;
  const name = customerName || 'there';
  const offer = getSmartOffer(cartValue, step);

  // Use custom template if provided
  if (template && template.trim().startsWith('<')) {
    return fillTemplate(template, { customerName: name, storeName, storeUrl, cartValue, cartItems, recoveryLink, offer, frontendUrl });
  }

  // Pick built-in by templateId
  const bp = { customerName: name, storeName, storeUrl, cartValue, cartItems, recoveryLink, step, frontendUrl };
  switch (templateId) {
    case 'minimal':  return buildMinimalEmail(bp);
    case 'urgent':   return buildUrgentEmail(bp);
    case 'friendly': return buildFriendlyEmail(bp);
    default:         return buildClassicEmail(bp);
  }
}
