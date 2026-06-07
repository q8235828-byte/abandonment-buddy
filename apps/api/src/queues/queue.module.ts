
import { Module } from '@nestjs/common';

import { QueueService } from './queue.service';
import { EmailModule } from '../email/email.module';
import { QueueController } from './queue.controller';

@Module({
  imports: [
    EmailModule,
  ],
  controllers: [
    QueueController
  ],

  providers: [
    QueueService,
  ],

  exports: [
    QueueService,
  ],
})
export class QueueModule {}

