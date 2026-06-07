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

  // Runs every 10 minutes automatically
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
      include: { store: true },
    });

    const now = new Date();
    const queued: string[] = [];

    for (const order of orders) {
      const timeoutMs = (order.store.abandonmentTimeoutMin || 180) * 60 * 1000;
      const lastActivity = new Date(order.updatedAt);
      const elapsed = now.getTime() - lastActivity.getTime();

      if (elapsed >= timeoutMs) {
        const updated = await this.prisma.abandonedOrder.update({
          where: { id: order.id },
          data: {
            isAbandoned: true,
            abandonedAt: new Date(),
            status: 'DETECTED',
          },
        });

        await this.queueService.addRecoveryEmailJob(updated.id);
        queued.push(updated.id);
        this.logger.log(`Cart abandoned → queued email: ${order.id} (${order.customerEmail})`);
      }
    }

    this.logger.log(`Abandonment check: ${orders.length} active carts, ${queued.length} newly abandoned`);
    return { checked: orders.length, abandoned: queued.length, queued };
  }

  async getOrders(userId: string) {
    return this.prisma.abandonedOrder.findMany({
      where: { store: { ownerId: userId } },
      orderBy: { createdAt: 'desc' },
      include: { store: true },
    });
  }
}
