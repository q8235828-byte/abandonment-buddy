import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async getStats() {
    const orders =
      await this.prisma.abandonedOrder.findMany();

    const abandoned =
      orders.filter(
        (o) => o.isAbandoned,
      );

    const recovered =
      orders.filter(
        (o) => o.status === 'RECOVERED',
      );

    const revenue =
      recovered.reduce(
        (sum, order) =>
          sum + Number(order.cartValue || 0),
        0,
      );

    return {
      abandonedCarts:
        abandoned.length,

      messagesSent:
        recovered.length,

      recoveryRate:
        orders.length
          ? Math.round(
              (recovered.length /
                orders.length) *
                100,
            )
          : 0,

      revenueRecovered:
        revenue,
    };
  }
}