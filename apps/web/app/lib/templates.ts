export const DEFAULT_EMAIL_TEMPLATE = `Hi {{customerName}},

You left items in your cart at {{storeName}}.

Complete your order:
{{checkoutLink}}`;

export const DEFAULT_WHATSAPP_TEMPLATE = `Hi {{customerName}},

You left products in your cart at {{storeName}}.

Complete checkout:
{{checkoutLink}}`;

export const DEFAULT_SMS_TEMPLATE =
  'Hi {{customerName}}, your {{storeName}} cart is waiting. Complete checkout: {{checkoutLink}}';

export const TEMPLATE_TOKENS = [
  '{{customerName}}',
  '{{checkoutLink}}',
  '{{storeName}}',
  '{{cartValue}}',
];

export function renderTemplate(
  template: string,
) {
  return template
    .replaceAll(
      '{{customerName}}',
      'Sarah',
    )
    .replaceAll(
      '{{checkoutLink}}',
      'https://store.com/checkout/recover',
    )
    .replaceAll(
      '{{storeName}}',
      'Demo Store',
    )
    .replaceAll(
      '{{cartValue}}',
      '$84.50',
    );
}
