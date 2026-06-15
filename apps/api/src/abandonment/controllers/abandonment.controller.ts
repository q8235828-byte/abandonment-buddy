import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AbandonmentService } from '../services/abandonment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Abandonment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('abandonment')
export class AbandonmentController {
  constructor(private readonly abandonmentService: AbandonmentService) {}

  @Post('check')
  checkOrders(@CurrentUser() user: any) {
    return this.abandonmentService.checkAbandonedOrders(user.userId);
  }

  @Get('orders')
  getOrders(@CurrentUser() user: any) {
    return this.abandonmentService.getOrders(user.userId);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.abandonmentService.getOrderById(id, user.userId);
  }
}
