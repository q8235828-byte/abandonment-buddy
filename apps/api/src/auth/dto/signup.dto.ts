import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
  })
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: 'password123',
  })
  @MinLength(6)
  password: string;
}