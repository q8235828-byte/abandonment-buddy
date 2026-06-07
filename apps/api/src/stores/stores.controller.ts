import {
Controller,
Post,
Get,
Patch,
Body,
Param,
UseGuards,
UsePipes,
ValidationPipe,
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

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
@Patch(':id/email-settings')
updateEmailSettings(
  @Param('id') storeId: string,
  @CurrentUser() user: any,
  @Body() dto: Record<string, any>,
) {
  return this.storesService.updateEmailSettings(storeId, user.userId, dto);
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Post(':id/test-email')
testEmailSettings(
  @Param('id') storeId: string,
  @CurrentUser() user: any,
) {
  return this.storesService.testEmailSettings(storeId, user.userId);
}
}