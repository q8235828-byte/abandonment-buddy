import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { PlanKey } from './plans.config';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@CurrentUser() user: any) {
    return this.billingService.getBillingStatus(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create-payment')
  createPayment(@CurrentUser() user: any, @Body() body: { plan: PlanKey }) {
    return this.billingService.createPayment(user.userId, body.plan);
  }

  @Post('webhook')
  handleWebhook(
    @Body() body: any,
    @Headers('x-nowpayments-sig') signature: string,
  ) {
    return this.billingService.handleWebhook(body, signature);
  }
}
