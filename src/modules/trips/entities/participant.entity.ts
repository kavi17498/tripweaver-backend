import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  Min,
  IsEnum,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { TripPaymentMethod } from './trip-payment-method.enum';

export class ParticipantPickupLocation {
  @ApiProperty({ description: 'Pickup location name', example: 'My Hotel' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Latitude', example: 6.9271 })
  @IsNotEmpty()
  @IsNumber()
  lat!: number;

  @ApiProperty({ description: 'Longitude', example: 79.8612 })
  @IsNotEmpty()
  @IsNumber()
  lng!: number;
}

export class Participant {
  @ApiProperty({
    description: 'Unique participant identifier',
    example: 'participant_12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  participantId?: string;

  @ApiProperty({
    description: 'User ID of the person who bought or owns this participation',
    example: 'user_12345',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  parentUserId?: string | null;

  @ApiProperty({ description: 'Participant name', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Participant gender',
    example: 'male',
    enum: ['male', 'female'],
  })
  @IsNotEmpty()
  @IsIn(['male', 'female'])
  @IsString()
  gender!: string;

  @ApiProperty({ description: 'Participant age', example: 28 })
  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  age!: number;

  @ApiProperty({
    description: 'Participant address',
    example: '123 Main St, Colombo',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Participant phone number',
    example: '+94701234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Participant email',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Selected payment method for this participant booking',
    enum: TripPaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(TripPaymentMethod)
  paymentMethod?: TripPaymentMethod;

  @ApiProperty({
    description: 'Participation status',
    enum: ['pending', 'accepted', 'rejected'],
    example: 'pending',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: 'pending' | 'accepted' | 'rejected';

  @ApiProperty({
    description: 'Grouping identifier for participants booked together',
    example: 'booking_12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({
    description: 'Participant pickup location',
    type: () => ParticipantPickupLocation,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParticipantPickupLocation)
  pickupLocation?: ParticipantPickupLocation;

  @ApiProperty({
    description: 'Pickup distance in kilometers',
    example: 12.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  pickupDistanceKm?: number;

  @ApiProperty({
    description: 'Pickup cost (calculated based on distance and guide cost per km)',
    example: 625,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  pickupCost?: number;

  @ApiProperty({
    description: 'Traveler pickup or meetup arrival time',
    example: '08:00 AM',
    required: false,
  })
  @IsOptional()
  @IsString()
  pickupTime?: string;
}


