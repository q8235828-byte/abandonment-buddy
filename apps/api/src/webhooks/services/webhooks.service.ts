import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../../billing/billing.service';
import { CartSessionDto } from '../dto/cart-session.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────

  private async getStoreAndVerify(storeId: string, signature: string, rawBody: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');

    const expected = crypto
      .createHmac('sha256', store.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return store;
  }

  // ── Health check ─────────────────────────────────────────────────────

  async healthCheck(storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    return {
      connected: store.status === 'CONNECTED',
      storeId: store.id,
      storeName: store.name,
      status: store.status,
    };
  }

  // ── Cart session (upsert by sessionId) ───────────────────────────────

  async receiveCartSession(storeId: string, signature: string, dto: CartSessionDto, rawBody: string) {
    const store = await this.getStoreAndVerify(storeId, signature, rawBody);

    if (!dto.sessionId) throw new BadRequestException('sessionId is required');

    const cartSnapshot = dto.cartItems ? JSON.parse(JSON.stringify(dto.cartItems)) : undefined;

    const existing = await this.prisma.abandonedOrder.findFirst({
      where: { storeId: store.id, sessionId: dto.sessionId },
    });

    if (existing) {
      return this.prisma.abandonedOrder.update({
        where: { id: existing.id },
        data: {
          customerEmail: dto.customerEmail ?? existing.customerEmail,
          customerName: dto.customerName ?? existing.customerName,
          customerPhone: dto.customerPhone ?? existing.customerPhone,
          cartValue: dto.cartTotal ?? existing.cartValue,
          cartSnapshot: cartSnapshot ?? existing.cartSnapshot,
          orderStatus: 'pending',
        },
      });
    }

    // New order — increment usage counter for store owner
    await this.billingService.checkAndIncrementOrders(store.ownerId);

    return this.prisma.abandonedOrder.create({
      data: {
        externalOrderId: dto.sessionId,
        sessionId: dto.sessionId,
        customerEmail: dto.customerEmail,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        cartValue: dto.cartTotal,
        cartSnapshot,
        orderStatus: 'pending',
        isAbandoned: false,
        storeId: store.id,
      },
    });
  }

  // ── Order completed → mark cart recovered ────────────────────────────

  async receiveOrderCompleted(storeId: string, signature: string, body: any, rawBody: string) {
    const store = await this.getStoreAndVerify(storeId, signature, rawBody);

    const { sessionId, orderId, cartTotal } = body;

    // Find by sessionId first, fall back to externalOrderId
    const order = await this.prisma.abandonedOrder.findFirst({
      where: {
        storeId: store.id,
        OR: [
          { sessionId: sessionId ?? '' },
          { externalOrderId: orderId ?? '' },
        ],
        status: { not: 'RECOVERED' },
      },
    });

    if (!order) {
      // No tracked cart for this session — create a recovered record
      return { message: 'No matching cart session; nothing to recover.' };
    }

    return this.prisma.abandonedOrder.update({
      where: { id: order.id },
      data: {
        status: 'RECOVERED',
        isAbandoned: false,
        recoveredAt: new Date(),
        externalOrderId: orderId ?? order.externalOrderId,
        cartValue: cartTotal ?? order.cartValue,
        orderStatus: 'completed',
      },
    });
  }

  // ── Legacy WooCommerce order webhook (no signature) ──────────────────

  async receiveWooOrder(storeId: string, dto: any) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');

    return this.prisma.abandonedOrder.create({
      data: {
        externalOrderId: dto.orderId,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        customerName: dto.customerName,
        cartValue: dto.cartValue,
        cartSnapshot: dto.cartSnapshot,
        orderStatus: dto.status,
        isAbandoned: false,
        storeId: store.id,
      },
    });
  }
}
