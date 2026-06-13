import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queues/queue.service';

@Injectable()
export class AbandonmentService {
  private readonly logger = new Logger(AbandonmentService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkAbandonedOrdersCron() {
    return this.checkAbandonedOrders();
  }

  async checkAbandonedOrders(userId?: string) {
    const orders = await this.prisma.abandonedOrder.findMany({
      where: {
        isAbandoned: false,
        emailSentAt: null,
        orderStatus: { in: ['pending', 'on-hold', 'failed'] },
        customerEmail: { not: null },
        ...(userId ? { store: { ownerId: userId } } : {}),
      },
      include: { store: { include: { campaigns: { take: 1 } } } },
    });

    const now = new Date();
    const queued: string[] = [];

    for (const order of orders) {
      const timeoutMs = (order.store.abandonmentTimeoutMin || 180) * 60 * 1000;
      const elapsed   = now.getTime() - new Date(order.updatedAt).getTime();

      if (elapsed < timeoutMs) continue;

      const updated = await this.prisma.abandonedOrder.update({
        where: { id: order.id },
        data:  { isAbandoned: true, abandonedAt: new Date(), status: 'DETECTED' },
      });

      const campaign = order.store.campaigns?.[0];
      const ms = (min: number) => min * 60 * 1000;

      // ── Email sequence ─────────────────────────────────────────────────────
      if (!campaign || campaign.emailEnabled) {
        const step1Delay = ms(campaign?.emailDelayMin ?? 30);
        await this.queueService.addRecoveryEmailJob(updated.id, 1, step1Delay);

        if (campaign?.emailStep2DelayMin) {
          await this.queueService.addRecoveryEmailJob(updated.id, 2, ms(campaign.emailStep2DelayMin));
        }
        if (campaign?.emailStep3DelayMin) {
          await this.queueService.addRecoveryEmailJob(updated.id, 3, ms(campaign.emailStep3DelayMin));
        }
      }

      // ── WhatsApp ───────────────────────────────────────────────────────────
      if (campaign?.whatsappEnabled && order.customerPhone) {
        await this.queueService.addWhatsAppJob(updated.id, ms(campaign.whatsappDelayMin ?? 60));
      }

      // ── SMS ────────────────────────────────────────────────────────────────
      if (campaign?.smsEnabled && order.customerPhone) {
        await this.queueService.addSmsJob(updated.id, ms(campaign.smsDelayMin ?? 120));
      }

      queued.push(updated.id);
      this.logger.log(`Cart abandoned → queued recovery jobs: ${order.id} (${order.customerEmail})`);
    }

    this.logger.log(`Abandonment check: ${orders.length} active carts, ${queued.length} newly abandoned`);
    return { checked: orders.length, abandoned: queued.length, queued };
  }

  async getOrders(userId: string) {
    return this.prisma.abandonedOrder.findMany({
      where:   { store: { ownerId: userId } },
      orderBy: { createdAt: 'desc' },
      include: { store: true },
    });
  }
}
