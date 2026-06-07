
import { Module } from '@nestjs/common';

import { AbandonmentController } from './controllers/abandonment.controller';
import { AbandonmentService } from './services/abandonment.service';

import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queues/queue.module';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
  ],

  controllers: [
    AbandonmentController,
  ],

  providers: [
    AbandonmentService,
  ],

  exports: [
    AbandonmentService,
  ],
})
export class AbandonmentModule {}

