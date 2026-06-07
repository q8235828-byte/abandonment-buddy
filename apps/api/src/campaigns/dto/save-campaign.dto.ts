import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SaveCampaignDto {
  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @ApiPropertyOptional({
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({
    default: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  emailDelayMin?: number;

  @ApiPropertyOptional({
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  whatsappDelayMin?: number;

  @ApiPropertyOptional({
    default: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  smsDelayMin?: number;

  @ApiPropertyOptional({
    example:
      'Hi {{customerName}}, complete your order here: {{checkoutLink}}',
  })
  @IsOptional()
  @IsString()
  emailTemplate?: string;

  @ApiPropertyOptional({
    example:
      'Hi {{customerName}}, your cart is waiting: {{checkoutLink}}',
  })
  @IsOptional()
  @IsString()
  whatsappTemplate?: string;

  @ApiPropertyOptional({
    example:
      'Hi {{customerName}}, your cart is still waiting: {{checkoutLink}}',
  })
  @IsOptional()
  @IsString()
  smsTemplate?: string;
}
