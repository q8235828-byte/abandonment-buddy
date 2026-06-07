
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AbandonmentController } from './controllers/abandonment.controller';
import { AbandonmentService } from './services/abandonment.service';

import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queues/queue.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    QueueModule,
    AuthModule,
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

