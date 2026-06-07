import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({
    example: 'My Woo Store',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example:
      'https://myshop.com',
  })
  @IsNotEmpty()
  domain: string;
}