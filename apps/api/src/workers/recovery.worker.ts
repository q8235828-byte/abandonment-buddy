import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const redisConnection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const worker = new Worker(
  'recovery-email',
  async (job) => {
    const { orderId } = job.data;
    console.log('📧 Processing Recovery Email:', orderId);

    const order = await prisma.abandonedOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'recovery@abandonmentbuddy.com',
      to: order.customerEmail || 'customer@test.com',
      subject: 'You left something behind 👀',
      html: `
        <h2>Hello ${order.customerName || 'there'}</h2>
        <p>Your cart is waiting. Come back and complete your purchase!</p>
        <p>Cart value: $${order.cartValue?.toFixed(2) ?? '0.00'}</p>
      `,
    });

    console.log('📧 Email Sent:', info.messageId);
  },
  { connection: redisConnection },
);

worker.on('completed', (job) => console.log('✅ Email Job Completed:', job?.id));
worker.on('failed', (job, err) => console.error('❌ Email Job Failed:', err.message));
