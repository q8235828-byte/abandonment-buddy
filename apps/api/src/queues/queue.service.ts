import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisConnection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null, enableReadyCheck: false },
);

@Injectable()
export class QueueService {
  private recoveryEmailQueue: Queue;
  private recoveryWhatsappQueue: Queue;
  private recoverySmsQueue: Queue;

  constructor() {
    this.recoveryEmailQueue = new Queue('recovery-email', { connection: redisConnection });
    this.recoveryWhatsappQueue = new Queue('recovery-whatsapp', { connection: redisConnection });
    this.recoverySmsQueue = new Queue('recovery-sms', { connection: redisConnection });
  }

  async addRecoveryEmailJob(orderId: string, step: number = 1, delayMs: number = 0) {
    const job = await this.recoveryEmailQueue.add(
      `send-email-step-${step}`,
      { orderId, step },
      { delay: delayMs },
    );
    console.log(`📧 Email step ${step} queued for order ${orderId} (delay: ${delayMs}ms):`, job.id);
    return job;
  }

  async addWhatsAppJob(orderId: string, delayMs: number = 0) {
    const job = await this.recoveryWhatsappQueue.add(
      'send-whatsapp',
      { orderId },
      { delay: delayMs },
    );
    console.log(`💬 WhatsApp job queued for order ${orderId} (delay: ${delayMs}ms):`, job.id);
    return job;
  }

  async addSmsJob(orderId: string, delayMs: number = 0) {
    const job = await this.recoverySmsQueue.add(
      'send-sms',
      { orderId },
      { delay: delayMs },
    );
    console.log(`📱 SMS job queued for order ${orderId} (delay: ${delayMs}ms):`, job.id);
    return job;
  }
}
