import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { WebhooksService } from '../services/webhooks.service';
import { WooCommerceOrderDto } from '../dto/woocommerce-order.dto';
import { CartSessionDto } from '../dto/cart-session.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('health/:storeId')
  healthCheck(@Param('storeId') storeId: string) {
    return this.webhooksService.healthCheck(storeId);
  }

  /** Signed endpoint — receives live cart session updates from the plugin */
  @Post('cart-session/:storeId')
  receiveCartSession(
    @Param('storeId') storeId: string,
    @Headers('x-ab-signature') signature: string,
    @Body() dto: CartSessionDto,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) throw new BadRequestException('Missing X-AB-Signature header');
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(dto);
    return this.webhooksService.receiveCartSession(storeId, signature, dto, rawBody);
  }

  /** Signed endpoint — marks a cart session as recovered when the order is paid */
  @Post('order-completed/:storeId')
  receiveOrderCompleted(
    @Param('storeId') storeId: string,
    @Headers('x-ab-signature') signature: string,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) throw new BadRequestException('Missing X-AB-Signature header');
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    return this.webhooksService.receiveOrderCompleted(storeId, signature, body, rawBody);
  }

  /** Legacy unsigned endpoint kept for backward compatibility */
  @Post('woocommerce/:storeId')
  receiveWooOrder(
    @Param('storeId') storeId: string,
    @Body() dto: WooCommerceOrderDto,
  ) {
    return this.webhooksService.receiveWooOrder(storeId, dto);
  }
}
