import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SaveCampaignDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  whatsappEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional() @IsInt() @Min(0)
  emailDelayMin?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional() @IsInt() @Min(0)
  whatsappDelayMin?: number;

  @ApiPropertyOptional({ default: 120 })
  @IsOptional() @IsInt() @Min(0)
  smsDelayMin?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  emailTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  whatsappTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  smsTemplate?: string;

  // Step 2 (e.g. 24h follow-up)
  @ApiPropertyOptional({ description: 'Delay in minutes from abandonment for step 2 email' })
  @IsOptional() @IsInt() @Min(0)
  emailStep2DelayMin?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  emailStep2Subject?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  emailStep2Template?: string;

  // Step 3 (e.g. 72h follow-up)
  @ApiPropertyOptional({ description: 'Delay in minutes from abandonment for step 3 email' })
  @IsOptional() @IsInt() @Min(0)
  emailStep3DelayMin?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  emailStep3Subject?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  emailStep3Template?: string;

  // A/B testing
  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  abTestEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  abVariantBSubject?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  abVariantBTemplate?: string;
}
