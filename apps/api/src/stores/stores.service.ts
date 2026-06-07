import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class StoresService {
constructor(
private prisma: PrismaService,
) {}

async createStore(
userId: string,
dto: any,
) {
const existingStore =
await this.prisma.store.findUnique({
where: {
domain: dto.domain,
},
});

if (existingStore) {
  throw new BadRequestException(
    'Store already exists',
  );
}

const apiKey =
  'ck_' +
  randomBytes(24).toString('hex');

const apiSecret =
  'cs_' +
  randomBytes(32).toString('hex');

const webhookSecret =
  randomBytes(32).toString('hex');

return this.prisma.store.create({
  data: {
    name: dto.name,
    domain: dto.domain,
    apiKey,
    apiSecret,
    webhookSecret,
    ownerId: userId,
  },
});

}

async getStores(
userId: string,
) {
return this.prisma.store.findMany({
where: {
ownerId: userId,
},
});
}

async updateEmailSettings(storeId: string, userId: string, dto: any) {
  const store = await this.prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
  });
  if (!store) throw new BadRequestException('Store not found');

  return this.prisma.store.update({
    where: { id: storeId },
    data: {
      smtpHost: dto.smtpHost,
      smtpPort: Number(dto.smtpPort) || 587,
      smtpUser: dto.smtpUser,
      smtpPass: dto.smtpPass,
      smtpFrom: dto.smtpFrom || dto.smtpUser,
      smtpSecure: dto.smtpSecure === true || dto.smtpSecure === 'true',
      smtpVerified: false,
    },
    select: {
      id: true, smtpHost: true, smtpPort: true,
      smtpUser: true, smtpFrom: true, smtpSecure: true, smtpVerified: true,
    },
  });
}

async testEmailSettings(storeId: string, userId: string) {
  const store = await this.prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
  });
  if (!store) throw new BadRequestException('Store not found');
  if (!store.smtpHost || !store.smtpUser || !store.smtpPass) {
    throw new BadRequestException('Email settings not configured yet');
  }

  const transporter = nodemailer.createTransport({
    host: store.smtpHost,
    port: store.smtpPort,
    secure: store.smtpSecure,
    auth: { user: store.smtpUser, pass: store.smtpPass },
    tls: { rejectUnauthorized: false },
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from: `"Abandonment Buddy" <${store.smtpFrom || store.smtpUser}>`,
    to: store.smtpUser,
    subject: '✅ Abandonment Buddy — Email connection verified',
    html: `<p>Your email is connected to <strong>${store.name}</strong> and ready to send cart recovery emails.</p>`,
  });

  await this.prisma.store.update({
    where: { id: storeId },
    data: { smtpVerified: true },
  });

  return { success: true, messageId: info.messageId };
}

async connectStore(
dto: any,
) {
console.log(
'Incoming DTO:',
dto,
);

const allStores =
  await this.prisma.store.findMany();

console.log(
  'All Stores:',
  allStores,
);

const store =
  await this.prisma.store.findFirst({
    where: {
      apiKey:
        dto.apiKey?.trim(),

      apiSecret:
        dto.apiSecret?.trim(),
    },
  });

console.log(
  'Matched Store:',
  store,
);

if (!store) {
  throw new BadRequestException(
    'Invalid API credentials',
  );
}

const updatedStore =
  await this.prisma.store.update({
    where: {
      id: store.id,
    },

    data: {
      status:
        'CONNECTED',
    },
  });

return {
  message: 'Store connected successfully',
  storeId: updatedStore.id,
  webhookSecret: updatedStore.webhookSecret,
  status: updatedStore.status,
};

}
}