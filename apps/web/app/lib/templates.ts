// ── Sample cart items HTML (used in preview only) ────────────────────────────
const SAMPLE_CART_ITEMS_HTML = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <thead>
    <tr style="background:#f8fafc;">
      <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Product</th>
      <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Qty</th>
      <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Price</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-top:1px solid #f1f5f9;">
      <td style="padding:12px 16px;font-size:13px;color:#0f172a;font-weight:500;">Premium Wireless Headphones</td>
      <td style="padding:12px 16px;text-align:center;font-size:13px;color:#64748b;">1</td>
      <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600;color:#0f172a;">$59.99</td>
    </tr>
    <tr style="border-top:1px solid #f1f5f9;">
      <td style="padding:12px 16px;font-size:13px;color:#0f172a;font-weight:500;">USB-C Charging Cable (3-pack)</td>
      <td style="padding:12px 16px;text-align:center;font-size:13px;color:#64748b;">2</td>
      <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600;color:#0f172a;">$24.50</td>
    </tr>
  </tbody>
</table>`;

// ── Default HTML email template ───────────────────────────────────────────────
export const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your cart is waiting — {{storeName}}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 4px 24px rgba(15,23,42,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">{{storeName}}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#64748b;">Cart Recovery</p>
            </td>
          </tr>

          <!-- Hero text -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.2;">
                Hey {{customerName}}, you forgot something! 🛒
              </h1>
              <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
                You left <strong style="color:#0f172a;">{{cartValue}}</strong> worth of items in your cart.
                We saved it for you — complete your order before it expires.
              </p>
            </td>
          </tr>

          <!-- Cart items -->
          <tr>
            <td style="padding:0 40px 8px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Your cart</p>
              {{cartItems}}
            </td>
          </tr>

          <!-- Order total -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:14px;color:#475569;font-weight:500;">Cart subtotal</td>
                        <td align="right" style="font-size:16px;font-weight:800;color:#0f172a;">{{cartValue}}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top:4px;font-size:12px;color:#94a3b8;">Shipping &amp; taxes calculated at checkout</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding:0 40px 16px;" align="center">
              <a href="{{recoveryLink}}"
                style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 52px;border-radius:12px;letter-spacing:0.01em;">
                ✅ Complete My Order →
              </a>
            </td>
          </tr>

          <!-- Link fallback -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Button not working? Copy this link:<br>
                <a href="{{recoveryLink}}" style="color:#0d9488;word-break:break-all;">{{recoveryLink}}</a>
              </p>
            </td>
          </tr>

          <!-- Urgency banner -->
          <tr>
            <td style="padding:0 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:14px 18px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa;">
                    <p style="margin:0;font-size:13px;color:#c2410c;line-height:1.5;">
                      ⏰ <strong>Your cart is reserved for a limited time.</strong>
                      Items may sell out — complete checkout now to secure yours.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                You received this email because you added items to your cart at
                <a href="{{storeUrl}}" style="color:#0d9488;text-decoration:none;">{{storeName}}</a>.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">
                <a href="{{unsubscribeLink}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp; {{storeUrl}}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

// ── Default WhatsApp template ─────────────────────────────────────────────────
export const DEFAULT_WHATSAPP_TEMPLATE = `Hi {{customerName}} 👋

You left *{{cartValue}}* worth of items in your cart at *{{storeName}}*.

🛒 *Your cart is saved and waiting for you!*

Complete your order here:
{{recoveryLink}}

⏰ Items are reserved for a limited time — don't miss out!

Reply STOP to unsubscribe.`;

// ── Default SMS template ──────────────────────────────────────────────────────
export const DEFAULT_SMS_TEMPLATE =
  `Hi {{customerName}}, your {{storeName}} cart ({{cartValue}}) is waiting! Complete checkout: {{recoveryLink}} Reply STOP to opt out.`;

// ── Template tokens ───────────────────────────────────────────────────────────
export const TEMPLATE_TOKENS = [
  '{{customerName}}',
  '{{storeName}}',
  '{{storeUrl}}',
  '{{cartValue}}',
  '{{cartItems}}',
  '{{recoveryLink}}',
  '{{unsubscribeLink}}',
];

// ── Render template (preview with sample data) ────────────────────────────────
export function renderTemplate(template: string, html = false): string {
  return template
    .replaceAll('{{customerName}}',    'Sarah Johnson')
    .replaceAll('{{storeName}}',       'Demo Store')
    .replaceAll('{{storeUrl}}',        'https://demo-store.com')
    .replaceAll('{{cartValue}}',       '$84.49')
    .replaceAll('{{recoveryLink}}',    'https://demo-store.com/cart?recover=abc123')
    .replaceAll('{{unsubscribeLink}}', 'https://app.abandonmentbuddy.com/unsubscribe?token=xyz')
    .replaceAll('{{cartItems}}',       SAMPLE_CART_ITEMS_HTML);
}

// ── Build cart items HTML from actual order data ──────────────────────────────
export function buildCartItemsHtml(items: Array<{ name: string; quantity: number; price: number; total?: number }>): string {
  if (!items || items.length === 0) return '';

  const rows = items.map((item) => `
    <tr style="border-top:1px solid #f1f5f9;">
      <td style="padding:12px 16px;font-size:13px;color:#0f172a;font-weight:500;">${item.name}</td>
      <td style="padding:12px 16px;text-align:center;font-size:13px;color:#64748b;">×${item.quantity}</td>
      <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600;color:#0f172a;">$${Number(item.total ?? item.price * item.quantity).toFixed(2)}</td>
    </tr>`).join('');

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <thead>
    <tr style="background:#f8fafc;">
      <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Product</th>
      <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Qty</th>
      <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}
