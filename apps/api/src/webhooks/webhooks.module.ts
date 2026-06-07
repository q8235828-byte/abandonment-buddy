
import { Module } from '@nestjs/common';

import { WebhooksController } from './controllers/webhooks.controller';

import { WebhooksService } from './services/webhooks.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    WebhooksController,
  ],

  providers: [
    WebhooksService,
  ],
})
export class WebhooksModule {}