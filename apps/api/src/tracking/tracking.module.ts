import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrackingController],
})
export class TrackingModule {}
