import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CartSessionDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsArray()
  cartItems?: any[];

  @IsOptional()
  @IsNumber()
  cartTotal?: number;
}
