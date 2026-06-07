
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queues/queue.service';

@Injectable()
export class AbandonmentService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async checkAbandonedOrders() {
    const orders =
      await this.prisma.abandonedOrder.findMany({
        where: {
          isAbandoned: false,

          orderStatus: {
            in: [
              'pending',
              'on-hold',
              'failed',
            ],
          },
        },

        include: {
          store: true,
        },
      });

    const now = new Date();

    const updatedOrders: any[] = [];

    for (const order of orders) {
      const timeoutMinutes =
        order.store.abandonmentTimeoutMin;

      const lastActivity =
        new Date(order.updatedAt);

      const diffMinutes =
        (now.getTime() - lastActivity.getTime()) / 1000 / 60;

      if (
        diffMinutes >=
        timeoutMinutes
      ) {
        const updated =
          await this.prisma.abandonedOrder.update({
            where: {
              id: order.id,
            },

            data: {
              isAbandoned: true,

              abandonedAt:
                new Date(),

              status:
                'DETECTED',
            },
          });

        updatedOrders.push(
          updated,
        );

        await this.queueService.addRecoveryEmailJob(
          updated.id,
        );
      }
    }

    return {
      success: true,

      checked:
        orders.length,

      abandoned:
        updatedOrders.length,

      orders:
        updatedOrders,
    };
  }

  async getOrders() {
    return this.prisma.abandonedOrder.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        store: true,
      },
    });
  }
}

