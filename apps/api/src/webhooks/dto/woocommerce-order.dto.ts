import {
  IsString,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class WooCommerceOrderDto {

  @IsString()
  orderId: string;

  @IsString()
  status: string;

  @IsString()
  customerEmail: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsNumber()
  cartValue?: number;
}