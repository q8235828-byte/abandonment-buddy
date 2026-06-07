import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PLANS, PlanKey } from './plans.config';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly nowApiKey = process.env.NOWPAYMENTS_API_KEY || '';
  private readonly nowIpnSecret = process.env.NOWPAYMENTS_IPN_SECRET || '';
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  constructor(private prisma: PrismaService) {}

  // ── Get billing status for a user ──────────────────────────────────────────
  async getBillingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true, planExpiresAt: true,
        ordersUsed: true, emailsUsed: true, smsUsed: true, whatsappUsed: true,
        usageResetAt: true,
      },
    });
    if (!user) throw new BadRequestException('User not found');

    const plan = PLANS[user.plan as PlanKey];
    const nextReset = new Date(user.usageResetAt);
    nextReset.setMonth(nextReset.getMonth() + 1);

    return {
      plan: user.plan,
      planName: plan.name,
      planExpiresAt: user.planExpiresAt,
      nextResetAt: nextReset,
      usage: {
        orders:    { used: user.ordersUsed,   limit: plan.orders },
        emails:    { used: user.emailsUsed,   limit: plan.emails },
        sms:       { used: user.smsUsed,      limit: plan.sms },
        whatsapp:  { used: user.whatsappUsed, limit: plan.whatsapp },
      },
      plans: Object.entries(PLANS).map(([key, p]) => ({
        key,
        name: p.name,
        priceUsd: p.priceUsd,
        description: p.description,
        features: p.features,
        limits: { orders: p.orders, emails: p.emails, sms: p.sms, whatsapp: p.whatsapp },
        current: key === user.plan,
      })),
    };
  }

  // ── Create NOWPayments invoice ──────────────────────────────────────────────
  async createPayment(userId: string, planKey: PlanKey) {
    const plan = PLANS[planKey];
    if (!plan || plan.priceUsd === 0) throw new BadRequestException('Invalid plan');

    if (!this.nowApiKey) throw new BadRequestException('Payment gateway not configured');

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new BadRequestException('User not found');

    // Create a pending payment record
    const payment = await this.prisma.payment.create({
      data: { userId, plan: planKey as any, amountUsd: plan.priceUsd, status: 'PENDING' },
    });

    // Call NOWPayments API
    const response = await axios.post(
      'https://api.nowpayments.io/v1/invoice',
      {
        price_amount: plan.priceUsd,
        price_currency: 'usd',
        order_id: payment.id,
        order_description: `Abandonment Buddy — ${plan.name} Plan (1 month)`,
        success_url: `${this.frontendUrl}/billing?success=1&plan=${planKey}`,
        cancel_url: `${this.frontendUrl}/billing?cancelled=1`,
        ipn_callback_url: `${process.env.API_URL || 'https://abandonment-cart.up.railway.app'}/billing/webhook`,
      },
      { headers: { 'x-api-key': this.nowApiKey, 'Content-Type': 'application/json' } },
    );

    const { id: invoiceId, invoice_url: paymentUrl } = response.data;

    // Save invoice details
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { invoiceId, paymentUrl },
    });

    return { paymentUrl, invoiceId, paymentId: payment.id };
  }

  // ── Handle NOWPayments IPN webhook ─────────────────────────────────────────
  async handleWebhook(body: any, signature: string) {
    // Verify HMAC signature
    if (this.nowIpnSecret) {
      const hmac = crypto.createHmac('sha512', this.nowIpnSecret);
      const sorted = JSON.stringify(this.sortObject(body));
      hmac.update(sorted);
      const expected = hmac.digest('hex');
      if (expected !== signature) {
        this.logger.warn('NOWPayments webhook signature mismatch');
        throw new BadRequestException('Invalid signature');
      }
    }

    const { order_id: paymentId, payment_status: status } = body;
    if (!paymentId) return { received: true };

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });
    if (!payment) return { received: true };

    // Map NOWPayments status to our status
    const confirmed = ['finished', 'confirmed', 'sending'].includes(status);
    const failed = ['failed', 'refunded', 'expired'].includes(status);

    if (confirmed && payment.status !== 'CONFIRMED') {
      await this.activatePlan(payment.userId, payment.plan as PlanKey);
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'CONFIRMED', nowPaymentId: body.payment_id?.toString() },
      });
      this.logger.log(`Plan activated: ${payment.plan} for user ${payment.userId}`);
    }

    if (failed) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: failed ? 'FAILED' : 'EXPIRED' },
      });
    }

    return { received: true };
  }

  // ── Activate plan on user ───────────────────────────────────────────────────
  private async activatePlan(userId: string, planKey: PlanKey) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: planKey as any,
        planExpiresAt: expiresAt,
        // Reset usage on new plan purchase
        ordersUsed: 0, emailsUsed: 0, smsUsed: 0, whatsappUsed: 0,
        usageResetAt: new Date(),
      },
    });
  }

  // ── Check and enforce order limit ───────────────────────────────────────────
  async checkAndIncrementOrders(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, ordersUsed: true },
    });
    if (!user) return false;

    const limit = PLANS[user.plan as PlanKey].orders;
    if (limit !== -1 && user.ordersUsed >= limit) return false;

    await this.prisma.user.update({
      where: { id: userId },
      data: { ordersUsed: { increment: 1 } },
    });
    return true;
  }

  async checkAndIncrementEmails(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, emailsUsed: true },
    });
    if (!user) return false;
    const limit = PLANS[user.plan as PlanKey].emails;
    if (limit !== -1 && user.emailsUsed >= limit) return false;
    await this.prisma.user.update({ where: { id: userId }, data: { emailsUsed: { increment: 1 } } });
    return true;
  }

  // ── Monthly usage reset cron ────────────────────────────────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetMonthlyUsage() {
    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: { usageResetAt: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
      select: { id: true, plan: true, planExpiresAt: true },
    });

    for (const user of users) {
      // Downgrade to FREE if plan expired
      const planExpired = user.planExpiresAt && user.planExpiresAt < now;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          ordersUsed: 0, emailsUsed: 0, smsUsed: 0, whatsappUsed: 0,
          usageResetAt: now,
          ...(planExpired ? { plan: 'FREE', planExpiresAt: null } : {}),
        },
      });
    }

    this.logger.log(`Monthly usage reset: ${users.length} users`);
  }

  private sortObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map((v) => this.sortObject(v));
    return Object.keys(obj).sort().reduce((acc: any, key) => { acc[key] = this.sortObject(obj[key]); return acc; }, {});
  }
}
