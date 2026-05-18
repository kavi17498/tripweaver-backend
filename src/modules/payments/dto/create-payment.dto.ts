import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 25000, description: 'Total payment amount in LKR' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'John', description: 'Customer first name' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Doe', description: 'Customer last name' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Customer email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+94771234567', description: 'Customer phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
