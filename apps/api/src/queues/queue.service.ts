import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisConnection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
);

@Injectable()
export class QueueService {
  private recoveryQueue: Queue;

  constructor() {
    this.recoveryQueue = new Queue('recovery-email', {
      connection: redisConnection,
    });
  }

  async addRecoveryEmailJob(orderId: string) {
    const job = await this.recoveryQueue.add('send-email', { orderId });
    console.log('📧 Recovery Email Queued:', job.id);
    return job;
  }
}
