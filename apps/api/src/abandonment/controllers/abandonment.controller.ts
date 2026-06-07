

import {
  Controller,
  Post,
  Get,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { AbandonmentService } from '../services/abandonment.service';

@ApiTags('Abandonment')
@Controller('abandonment')
export class AbandonmentController {
  constructor(
    private readonly abandonmentService: AbandonmentService,
  ) {}

  @Post('check')
  checkOrders() {
    return this.abandonmentService.checkAbandonedOrders();
  }

  @Get('orders')
  getOrders() {
    return this.abandonmentService.getOrders();
  }
}

