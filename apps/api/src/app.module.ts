import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import './workers/recovery.worker';
import './workers/whatsapp.worker';
import './workers/sms.worker';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StoresModule } from './stores/stores.module';
import { UsersModule } from './users/users.module';

import { WebhooksModule } from './webhooks/webhooks.module';
import { AbandonmentModule } from './abandonment/abandonment.module';

import { QueueModule } from './queues/queue.module';

import { DashboardModule } from './dashboard/dashboard.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { TrackingModule } from './tracking/tracking.module';
import { PluginModule } from './plugin/plugin.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    StoresModule,
    UsersModule,
    WebhooksModule,
    AbandonmentModule,
    QueueModule,
    DashboardModule,
    CampaignsModule,
    BillingModule,
    AdminModule,
    TrackingModule,
    PluginModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}