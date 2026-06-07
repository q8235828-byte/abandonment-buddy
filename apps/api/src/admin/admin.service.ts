import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { PLANS, PlanKey } from '../billing/plans.config';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── Platform stats ──────────────────────────────────────────────────────
  async getStats() {
    const [totalUsers, totalStores, totalOrders, payments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.store.count(),
      this.prisma.abandonedOrder.count(),
      this.prisma.payment.findMany({ where: { status: 'CONFIRMED' }, select: { amountUsd: true } }),
    ]);

    const planCounts = await this.prisma.user.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });

    const revenue = payments.reduce((sum, p) => sum + p.amountUsd, 0);

    return {
      totalUsers,
      totalStores,
      totalOrders,
      totalRevenue: revenue,
      planBreakdown: planCounts.map((p) => ({ plan: p.plan, count: p._count.plan })),
    };
  }

  // ── List all users ──────────────────────────────────────────────────────
  async getUsers(search?: string) {
    const users = await this.prisma.user.findMany({
      where: search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
          { country: { contains: search, mode: 'insensitive' } },
        ],
      } : undefined,
      select: {
        id: true, email: true, fullName: true, createdAt: true,
        plan: true, planExpiresAt: true,
        ordersUsed: true, emailsUsed: true, smsUsed: true, whatsappUsed: true,
        customOrderLimit: true, customEmailLimit: true, customSmsLimit: true, customWhatsappLimit: true,
        isAdmin: true, lastLoginIp: true, lastLoginAt: true, country: true, city: true,
        _count: { select: { stores: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => {
      const plan = PLANS[u.plan as PlanKey];
      return {
        ...u,
        storeCount:   u._count.stores,
        paymentCount: u._count.payments,
        limits: {
          orders:    u.customOrderLimit    ?? plan.orders,
          emails:    u.customEmailLimit    ?? plan.emails,
          sms:       u.customSmsLimit      ?? plan.sms,
          whatsapp:  u.customWhatsappLimit ?? plan.whatsapp,
        },
      };
    });
  }

  // ── Get single user ─────────────────────────────────────────────────────
  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        stores: { select: { id: true, name: true, domain: true, status: true, abandonmentTimeoutMin: true, createdAt: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { stores: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const { password, smtpPass, twilioAuthToken, ...safe } = user as any;
    return safe;
  }

  // ── Update user plan ────────────────────────────────────────────────────
  async updateUserPlan(userId: string, plan: PlanKey, months = 1) {
    const expiresAt = plan === 'FREE' ? null : (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      return d;
    })();

    return this.prisma.user.update({
      where: { id: userId },
      data: { plan: plan as any, planExpiresAt: expiresAt },
      select: { id: true, email: true, plan: true, planExpiresAt: true },
    });
  }

  // ── Set custom limits ───────────────────────────────────────────────────
  async updateCustomLimits(userId: string, dto: {
    customOrderLimit?: number | null;
    customEmailLimit?: number | null;
    customSmsLimit?: number | null;
    customWhatsappLimit?: number | null;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, email: true, customOrderLimit: true, customEmailLimit: true, customSmsLimit: true, customWhatsappLimit: true },
    });
  }

  // ── Reset usage ─────────────────────────────────────────────────────────
  async resetUsage(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ordersUsed: 0, emailsUsed: 0, smsUsed: 0, whatsappUsed: 0, usageResetAt: new Date() },
      select: { id: true, email: true },
    });
  }

  // ── Toggle admin ────────────────────────────────────────────────────────
  async toggleAdmin(userId: string, isAdmin: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: { id: true, email: true, isAdmin: true },
    });
  }

  // ── Geo-lookup from IP ──────────────────────────────────────────────────
  static async lookupIp(ip: string): Promise<{ country: string; city: string } | null> {
    if (!ip || ip === '::1' || ip.startsWith('127.')) return null;
    try {
      const res = await axios.get(`http://ip-api.com/json/${ip}?fields=country,city,status`, { timeout: 3000 });
      if (res.data.status === 'success') return { country: res.data.country, city: res.data.city };
    } catch {}
    return null;
  }
}
