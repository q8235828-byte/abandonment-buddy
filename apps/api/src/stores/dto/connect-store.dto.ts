import {
  IsNotEmpty,
} from 'class-validator';

import {
  ApiProperty,
} from '@nestjs/swagger';

export class ConnectStoreDto {
  @ApiProperty()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty()
  @IsNotEmpty()
  apiSecret: string;
}