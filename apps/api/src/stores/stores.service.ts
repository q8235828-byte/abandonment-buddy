import {
Injectable,
BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

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