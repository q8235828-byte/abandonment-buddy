import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const twilioLib = require('twilio');
const makeTwilio: (sid: string, token: string) => ReturnType<typeof twilioLib> = twilioLib;

const prisma = new PrismaClient();

const redisConnection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null, enableReadyCheck: false },
);

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replaceAll(`{{${key}}}`, val),
    template,
  );
}

function buildTwilioClient(user: any) {
  const sid   = user?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const token = user?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return makeTwilio(sid, token);
}

const worker = new Worker(
  'recovery-sms',
  async (job) => {
    const { orderId } = job.data;
    console.log('📱 Processing SMS recovery for order:', orderId);

    const order = await prisma.abandonedOrder.findUnique({
      where: { id: orderId },
      include: {
        store: { include: { owner: true, campaigns: { take: 1 } } },
      },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    if (order.status === 'RECOVERED') {
      console.log(`⏭ Order ${orderId} already recovered, skipping SMS`);
      return;
    }

    if (order.smsSentAt) {
      console.log(`⏭ SMS already sent for ${orderId}, skipping`);
      return;
    }

    const phone = order.customerPhone;
    if (!phone) throw new Error(`Order ${orderId} has no customer phone`);

    const campaign  = order.store.campaigns?.[0];
    const cartValue = Number(order.cartValue || 0);
    const storeUrl  = `https://${order.store.domain}`;
    const recoveryLink = `${storeUrl}/cart?recover=${order.sessionId || order.externalOrderId}`;
    const name = order.customerName?.split(' ')[0] || 'there';

    const defaultTemplate = `Hi {{customerName}}, your cart at {{storeName}} is waiting! Complete checkout: {{recoveryLink}}`;
    const rawTemplate = campaign?.smsTemplate || defaultTemplate;

    const message = fillTemplate(rawTemplate, {
      customerName: name,
      storeName:    order.store.name,
      storeUrl,
      cartValue:    `$${cartValue.toFixed(2)}`,
      recoveryLink,
    });

    const client = buildTwilioClient(order.store.owner);
    if (!client) throw new Error('Twilio credentials not configured');

    const fromNum = order.store.owner?.twilioFromPhone || process.env.TWILIO_FROM_PHONE;
    if (!fromNum) throw new Error('Twilio from phone not configured');

    const toNum = phone.startsWith('+') ? phone : `+${phone}`;

    await client.messages.create({
      from: fromNum,
      to:   toNum,
      body: message,
    });

    await prisma.abandonedOrder.update({
      where: { id: orderId },
      data:  { smsSentAt: new Date() },
    });

    console.log('📱 SMS sent to:', toNum);
  },
  { connection: redisConnection, concurrency: 3 },
);

worker.on('completed', (job) => console.log('✅ SMS job done:', job?.id));
worker.on('failed',    (job, err) => console.error('❌ SMS job failed:', job?.id, err.message));
