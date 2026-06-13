// ── Sample data for preview ───────────────────────────────────────────────────
const SAMPLE_CART_ITEMS_HTML = `
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <thead>
    <tr style="background:#f8fafc;">
      <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Product</th>
      <th style="padding:12px 8px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Qty</th>
      <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Price</th>
      <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Total</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#ffffff;">
      <td style="padding:14px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">Premium Wireless Headphones<br><span style="font-size:11px;color:#94a3b8;font-weight:400;">SKU: WH-1000</span></td>
      <td style="padding:14px 8px;text-align:center;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">1</td>
      <td style="padding:14px 16px;text-align:right;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">$59.99</td>
      <td style="padding:14px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;">$59.99</td>
    </tr>
    <tr style="background:#ffffff;">
      <td style="padding:14px 16px;font-size:13px;color:#0f172a;font-weight:600;">USB-C Charging Cable 3-pack<br><span style="font-size:11px;color:#94a3b8;font-weight:400;">SKU: CB-USB3</span></td>
      <td style="padding:14px 8px;text-align:center;font-size:13px;color:#475569;">2</td>
      <td style="padding:14px 16px;text-align:right;font-size:13px;color:#475569;">$12.25</td>
      <td style="padding:14px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">$24.50</td>
    </tr>
  </tbody>
</table>`;

// ── Smart discount logic based on cart value ──────────────────────────────────
// Runs server-side in the recovery worker to pick the right offer per cart
export function getSmartOffer(cartValue: number): {
  headline: string;
  subline: string;
  code: string;
  badgeLabel: string;
  badgeColor: string;
} {
  if (cartValue >= 150) {
    return {
      headline: '🎁 Exclusive 10% off — just for you',
      subline: `You have ${cartValue >= 200 ? 'a premium' : 'a great'} cart! As a thank-you, use code <strong>SAVE10</strong> at checkout for 10% off your entire order.`,
      code: 'SAVE10',
      badgeLabel: '10% OFF',
      badgeColor: '#7c3aed',
    };
  }
  if (cartValue >= 50) {
    return {
      headline: '💰 5% off to help you complete your order',
      subline: 'Use code <strong>COMEBACK5</strong> at checkout for 5% off. Valid for the next 24 hours only.',
      code: 'COMEBACK5',
      badgeLabel: '5% OFF',
      badgeColor: '#0d9488',
    };
  }
  return {
    headline: '🚚 Free shipping on your order!',
    subline: 'Complete checkout now and we\'ll ship your order for free. Use code <strong>FREESHIP</strong> at checkout.',
    code: 'FREESHIP',
    badgeLabel: 'FREE SHIPPING',
    badgeColor: '#0891b2',
  };
}

// ── Default HTML email template ───────────────────────────────────────────────
export const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your cart is waiting — {{storeName}}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,0.10);">

  <!-- ── Header ── -->
  <tr>
    <td style="background:#0f172a;padding:28px 40px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">{{storeName}}</p>
      <p style="margin:6px 0 0;font-size:12px;color:#64748b;letter-spacing:.04em;">CART RECOVERY</p>
    </td>
  </tr>

  <!-- ── Hero ── -->
  <tr>
    <td style="padding:36px 40px 20px;">
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.25;">
        Hey {{customerName}}, you left something behind! 🛒
      </h1>
      <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">
        You added <strong style="color:#0f172a;">{{cartValue}}</strong> worth of items to your cart at
        <strong style="color:#0f172a;">{{storeName}}</strong> but didn't complete checkout.
        No worries — we saved everything for you.
      </p>
    </td>
  </tr>

  <!-- ── Cart items ── -->
  <tr>
    <td style="padding:0 40px 8px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Items in your cart</p>
      {{cartItems}}
    </td>
  </tr>

  <!-- ── Cart total ── -->
  <tr>
    <td style="padding:8px 40px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:14px 18px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
            <table width="100%">
              <tr>
                <td style="font-size:14px;color:#64748b;">Cart subtotal</td>
                <td align="right" style="font-size:18px;font-weight:800;color:#0f172a;">{{cartValue}}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:4px;font-size:12px;color:#94a3b8;">
                  Shipping &amp; taxes calculated at checkout
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── Smart discount offer ── -->
  <tr>
    <td style="padding:0 40px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:20px 22px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border-radius:12px;border:1px solid #bbf7d0;">
            <table width="100%">
              <tr>
                <td>
                  <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#065f46;">{{offerHeadline}}</p>
                  <p style="margin:0 0 14px;font-size:13px;color:#047857;line-height:1.6;">{{offerSubline}}</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#065f46;color:#ffffff;font-size:14px;font-weight:800;padding:10px 22px;border-radius:8px;letter-spacing:.08em;">
                        {{discountCode}}
                      </td>
                      <td style="padding-left:12px;font-size:12px;color:#64748b;">Copy &amp; paste at checkout</td>
                    </tr>
                  </table>
                </td>
                <td width="60" valign="top" align="right">
                  <div style="background:{{badgeColor}};color:#ffffff;font-size:11px;font-weight:800;padding:5px 10px;border-radius:20px;text-align:center;white-space:nowrap;">{{badgeLabel}}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── CTA button ── -->
  <tr>
    <td style="padding:0 40px 16px;" align="center">
      <a href="{{recoveryLink}}"
        style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 52px;border-radius:12px;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(13,148,136,0.35);">
        ✅ Complete My Order →
      </a>
    </td>
  </tr>

  <!-- ── Link fallback ── -->
  <tr>
    <td style="padding:0 40px 28px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Button not working? <a href="{{recoveryLink}}" style="color:#0d9488;">Click here to open your cart</a>
      </p>
    </td>
  </tr>

  <!-- ── Checkout help ── -->
  <tr>
    <td style="padding:0 40px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:20px 22px;background:#fafafa;border-radius:12px;border:1px solid #e2e8f0;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0f172a;">Having trouble checking out?</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" valign="top" style="padding-right:12px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;">💳 Payment declined?</p>
                  <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">Try a different card, check your billing address matches exactly, or use PayPal as an alternative.</p>
                </td>
                <td width="50%" valign="top" style="padding-left:12px;border-left:1px solid #e2e8f0;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;">🔄 Page won't load?</p>
                  <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">Clear browser cookies or try a different browser. Your cart is saved — nothing will be lost.</p>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:14px;">
                  <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">
                    Still stuck? Reply to this email — we're happy to help complete your order manually.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── Urgency ── -->
  <tr>
    <td style="padding:0 40px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:14px 18px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa;text-align:center;">
            <p style="margin:0;font-size:13px;color:#c2410c;line-height:1.5;">
              ⏰ <strong>Your cart &amp; discount code expire in 24 hours.</strong>
              Complete checkout now before items sell out.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── Footer ── -->
  <tr>
    <td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">
        You received this because you added items to your cart at
        <a href="{{storeUrl}}" style="color:#0d9488;text-decoration:none;">{{storeName}}</a>.
        We never share your information.
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">
        <a href="{{unsubscribeLink}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
        &nbsp;·&nbsp; {{storeUrl}}
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

// ── Pre-built template catalogue ──────────────────────────────────────────────
export type TemplateId = 'classic' | 'minimal' | 'urgent' | 'friendly' | 'custom';

export interface PrebuiltTemplate {
  id: TemplateId;
  name: string;
  description: string;
  tag: string;
  tagColor: string;
  previewBg: string;
  previewAccent: string;
  previewHtml: string; // simplified preview snippet shown in the picker
}

export const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Dark header, clean layout, teal CTA. Professional and proven.',
    tag: 'Most Popular',
    tagColor: 'teal',
    previewBg: '#f1f5f9',
    previewAccent: '#0d9488',
    previewHtml: `<div style="font-family:sans-serif;background:#f1f5f9;padding:12px;border-radius:8px;">
      <div style="background:#0f172a;color:#fff;padding:10px;border-radius:6px 6px 0 0;text-align:center;font-size:11px;font-weight:800;letter-spacing:.05em;">YOUR STORE · CART RECOVERY</div>
      <div style="background:#fff;padding:12px;border-radius:0 0 6px 6px;">
        <div style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:6px;">Hey Sarah, you left something behind! 🛒</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:6px;font-size:9px;color:#475569;margin-bottom:8px;">📦 Premium Headphones ×1 · $59.99</div>
        <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:4px;padding:6px;font-size:9px;color:#065f46;margin-bottom:8px;">🎁 Use code COMEBACK5 — 5% OFF</div>
        <div style="background:#0d9488;color:#fff;text-align:center;padding:6px;border-radius:4px;font-size:9px;font-weight:700;">✅ Complete My Order →</div>
      </div>
    </div>`,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean white, serif-inspired, no heavy header. Elegant and understated.',
    tag: 'Premium Look',
    tagColor: 'slate',
    previewBg: '#ffffff',
    previewAccent: '#0f172a',
    previewHtml: `<div style="font-family:Georgia,serif;background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
      <div style="border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px;">
        <span style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-family:sans-serif;color:#0f172a;">YOUR STORE</span>
      </div>
      <div style="font-size:11px;font-weight:600;color:#94a3b8;font-family:sans-serif;margin-bottom:3px;">Hi Sarah,</div>
      <div style="font-size:13px;color:#0f172a;margin-bottom:8px;line-height:1.4;">You left something in your cart.</div>
      <div style="border:1px solid #e2e8f0;border-radius:4px;padding:6px;font-size:9px;color:#475569;margin-bottom:8px;font-family:sans-serif;">Premium Headphones · $59.99</div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:6px 8px;font-size:9px;font-family:sans-serif;margin-bottom:8px;color:#0f172a;">Code: <strong>COMEBACK5</strong> — 5% off</div>
      <div style="background:#0f172a;color:#fff;text-align:center;padding:6px;border-radius:4px;font-size:9px;font-weight:600;font-family:sans-serif;">Complete your order →</div>
    </div>`,
  },
  {
    id: 'urgent',
    name: 'Urgent',
    description: 'Red urgency banner, bold countdown copy. Maximum pressure for last-chance emails.',
    tag: 'High Converting',
    tagColor: 'red',
    previewBg: '#fafafa',
    previewAccent: '#dc2626',
    previewHtml: `<div style="font-family:sans-serif;background:#fafafa;padding:12px;border-radius:8px;">
      <div style="background:#dc2626;color:#fff;padding:7px;border-radius:6px 6px 0 0;text-align:center;font-size:9px;font-weight:800;letter-spacing:.04em;">⚠️ CART EXPIRING IN 24 HOURS — ACT NOW</div>
      <div style="background:#fff;padding:12px;border-radius:0 0 6px 6px;border:1px solid #fecdd3;border-top:none;">
        <div style="font-size:11px;font-weight:900;color:#0f172a;margin-bottom:6px;">Sarah, your $84.49 cart is about to expire!</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:6px;font-size:9px;color:#475569;margin-bottom:7px;">📦 Premium Headphones ×1 · $59.99</div>
        <div style="background:#fff1f2;border:2px solid #fecdd3;border-radius:4px;padding:6px;text-align:center;margin-bottom:7px;">
          <div style="font-size:10px;font-weight:900;color:#dc2626;">🎁 COMEBACK5 — 5% OFF</div>
          <div style="font-size:8px;color:#f43f5e;font-weight:600;">⏰ Expires in 24 hours</div>
        </div>
        <div style="background:#dc2626;color:#fff;text-align:center;padding:7px;border-radius:5px;font-size:9px;font-weight:900;">🛒 COMPLETE MY ORDER NOW →</div>
      </div>
    </div>`,
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm amber tones, emoji-rich, conversational. Feels personal, not automated.',
    tag: 'High Engagement',
    tagColor: 'amber',
    previewBg: '#fffbeb',
    previewAccent: '#d97706',
    previewHtml: `<div style="font-family:sans-serif;background:#fffbeb;padding:12px;border-radius:8px;">
      <div style="background:linear-gradient(135deg,#fef9c3,#fef3c7);padding:10px;border-radius:6px 6px 0 0;text-align:center;border:1px solid #fde68a;border-bottom:none;">
        <div style="font-size:18px;line-height:1;">🛍️</div>
        <div style="font-size:10px;font-weight:800;color:#92400e;margin-top:3px;">YOUR STORE</div>
      </div>
      <div style="background:#fff;padding:12px;border-radius:0 0 6px 6px;border:1px solid #fde68a;border-top:none;">
        <div style="font-size:11px;font-weight:800;color:#1c1917;margin-bottom:5px;">Hey Sarah! 👋 You forgot something awesome!</div>
        <div style="background:#f5f5f4;border-radius:4px;padding:6px;font-size:9px;color:#57534e;margin-bottom:7px;">📦 Premium Headphones · $59.99</div>
        <div style="background:linear-gradient(135deg,#fef9c3,#fef3c7);border:2px solid #fde68a;border-radius:6px;padding:7px;margin-bottom:7px;">
          <div style="font-size:9px;font-weight:800;color:#92400e;">🎁 5% off with code COMEBACK5</div>
        </div>
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-align:center;padding:7px;border-radius:50px;font-size:9px;font-weight:800;">Grab My Cart 🛒</div>
      </div>
    </div>`,
  },
];

// ── WhatsApp template ─────────────────────────────────────────────────────────
export const DEFAULT_WHATSAPP_TEMPLATE = `Hi {{customerName}} 👋

You left *{{cartValue}}* worth of items in your cart at *{{storeName}}*.

🛒 *Your cart items are saved and waiting!*

Here's a special offer just for you:
🎁 Use code *{{discountCode}}* for {{badgeLabel}} off your order!

Complete your order here:
{{recoveryLink}}

Having payment issues? Just reply to this message — we'll help you complete your order.

⏰ Offer expires in 24 hours!

Reply STOP to unsubscribe.`;

// ── SMS template ──────────────────────────────────────────────────────────────
export const DEFAULT_SMS_TEMPLATE = `{{storeName}}: Hi {{customerName}}! Your cart ({{cartValue}}) is waiting. Use {{discountCode}} for {{badgeLabel}} off. Complete checkout: {{recoveryLink}} Reply STOP to opt out.`;

// ── All tokens ────────────────────────────────────────────────────────────────
export const TEMPLATE_TOKENS = [
  '{{customerName}}',
  '{{storeName}}',
  '{{storeUrl}}',
  '{{cartValue}}',
  '{{cartItems}}',
  '{{recoveryLink}}',
  '{{discountCode}}',
  '{{badgeLabel}}',
  '{{offerHeadline}}',
  '{{offerSubline}}',
  '{{badgeColor}}',
  '{{unsubscribeLink}}',
];

// ── Preview render (sample data) ──────────────────────────────────────────────
export function renderTemplate(template: string): string {
  const offer = getSmartOffer(84.49);
  return template
    .replaceAll('{{customerName}}',    'Sarah Johnson')
    .replaceAll('{{storeName}}',       'Demo Store')
    .replaceAll('{{storeUrl}}',        'https://demo-store.com')
    .replaceAll('{{cartValue}}',       '$84.49')
    .replaceAll('{{recoveryLink}}',    'https://demo-store.com/cart?recover=abc123')
    .replaceAll('{{unsubscribeLink}}', 'https://app.abandonmentbuddy.com/unsubscribe?token=xyz')
    .replaceAll('{{cartItems}}',       SAMPLE_CART_ITEMS_HTML)
    .replaceAll('{{discountCode}}',    offer.code)
    .replaceAll('{{badgeLabel}}',      offer.badgeLabel)
    .replaceAll('{{badgeColor}}',      offer.badgeColor)
    .replaceAll('{{offerHeadline}}',   offer.headline)
    .replaceAll('{{offerSubline}}',    offer.subline);
}

// ── Build cart items HTML from real order data ────────────────────────────────
export function buildCartItemsHtml(
  items: Array<{ name: string; quantity: number; price: number; total?: number }>
): string {
  if (!items?.length) return '';
  const rows = items.map((item) => `
    <tr style="background:#ffffff;">
      <td style="padding:13px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">${item.name}</td>
      <td style="padding:13px 8px;text-align:center;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">×${item.quantity}</td>
      <td style="padding:13px 16px;text-align:right;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">$${Number(item.price).toFixed(2)}</td>
      <td style="padding:13px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;">$${Number(item.total ?? item.price * item.quantity).toFixed(2)}</td>
    </tr>`).join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <thead>
    <tr style="background:#f8fafc;">
      <th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Product</th>
      <th style="padding:11px 8px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Qty</th>
      <th style="padding:11px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Price</th>
      <th style="padding:11px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;">Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}
