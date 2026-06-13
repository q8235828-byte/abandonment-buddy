import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string) {
    const orders = await this.prisma.abandonedOrder.findMany({
      where: { store: { ownerId: userId } },
    });

    const abandoned  = orders.filter((o) => o.isAbandoned);
    const recovered  = orders.filter((o) => o.status === 'RECOVERED');
    const revenue    = recovered.reduce((s, o) => s + Number(o.cartValue || 0), 0);

    // ── Per-channel ───────────────────────────────────────────────────────────
    const emailSent     = orders.filter((o) => o.emailSentAt).length;
    const whatsappSent  = orders.filter((o) => (o as any).whatsappSentAt).length;
    const smsSent       = orders.filter((o) => (o as any).smsSentAt).length;

    const emailRecovered     = orders.filter((o) => o.status === 'RECOVERED' && (o as any).recoveredBy === 'EMAIL').length;
    const whatsappRecovered  = orders.filter((o) => o.status === 'RECOVERED' && (o as any).recoveredBy === 'WHATSAPP').length;
    const smsRecovered       = orders.filter((o) => o.status === 'RECOVERED' && (o as any).recoveredBy === 'SMS').length;

    // ── Sequence funnel ───────────────────────────────────────────────────────
    const step1Sent = orders.filter((o) => o.emailSentAt).length;
    const step2Sent = orders.filter((o) => (o as any).emailStep2SentAt).length;
    const step3Sent = orders.filter((o) => (o as any).emailStep3SentAt).length;

    // ── A/B testing ───────────────────────────────────────────────────────────
    const abOrders = orders.filter((o) => (o as any).abVariant);
    const abVariantASent      = abOrders.filter((o) => (o as any).abVariant === 'A').length;
    const abVariantBSent      = abOrders.filter((o) => (o as any).abVariant === 'B').length;
    const abVariantARecovered = abOrders.filter((o) => (o as any).abVariant === 'A' && o.status === 'RECOVERED').length;
    const abVariantBRecovered = abOrders.filter((o) => (o as any).abVariant === 'B' && o.status === 'RECOVERED').length;

    // ── Email open/click rates ────────────────────────────────────────────────
    const emailOpened  = orders.filter((o) => (o as any).emailOpenedAt).length;
    const emailClicked = orders.filter((o) => (o as any).emailClickedAt).length;

    // ── Daily time series (last 30 days) ──────────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecovered = orders.filter(
      (o) => o.status === 'RECOVERED' && o.recoveredAt && new Date(o.recoveredAt) >= thirtyDaysAgo,
    );

    const dailyMap: Record<string, { revenue: number; recovered: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { revenue: 0, recovered: 0 };
    }
    for (const o of recentRecovered) {
      const key = new Date(o.recoveredAt!).toISOString().slice(0, 10);
      if (dailyMap[key]) {
        dailyMap[key].revenue   += Number(o.cartValue || 0);
        dailyMap[key].recovered += 1;
      }
    }
    const dailyRevenue = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));

    return {
      // Legacy fields (dashboard still uses these)
      abandonedCarts:   abandoned.length,
      messagesSent:     emailSent + whatsappSent + smsSent,
      recoveryRate:     orders.length ? Math.round((recovered.length / orders.length) * 100) : 0,
      revenueRecovered: revenue,

      // Per-channel
      emailSent,
      whatsappSent,
      smsSent,
      emailRecovered,
      whatsappRecovered,
      smsRecovered,

      // Sequence funnel
      step1Sent,
      step2Sent,
      step3Sent,

      // A/B testing
      abVariantASent,
      abVariantBSent,
      abVariantARecovered,
      abVariantBRecovered,

      // Open/click rates
      emailOpened,
      emailClicked,

      // Time series
      dailyRevenue,
    };
  }
}
