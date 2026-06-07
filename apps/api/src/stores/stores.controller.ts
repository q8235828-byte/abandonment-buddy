import {
Controller,
Post,
Get,
Body,
UseGuards,
} from '@nestjs/common';

import {
ApiBearerAuth,
ApiTags,
} from '@nestjs/swagger';

import { StoresService } from './stores.service';

import { CreateStoreDto } from './dto/create-store.dto';
import { ConnectStoreDto } from './dto/connect-store.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
constructor(
private readonly storesService: StoresService,
) {}

// Protected route
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Post()
createStore(
@CurrentUser()
user: any,

@Body()
dto: CreateStoreDto,

) {
return this.storesService.createStore(
user.userId,
dto,
);
}

// PUBLIC ROUTE
// WooCommerce plugin connects here
@Post('connect')
connectStore(
@Body()
dto: ConnectStoreDto,
) {
return this.storesService.connectStore(
dto,
);
}

// Protected route
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Get()
getStores(
@CurrentUser()
user: any,
) {
return this.storesService.getStores(
user.userId,
);
}
}