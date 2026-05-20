import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { TripPaymentMethod } from '../entities/trip-core.entity';
import { Participant } from '../entities/participant.entity';

export class AddParticipantsDto {
  @ApiProperty({
    description: 'Selected payment method for this booking',
    enum: TripPaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(TripPaymentMethod)
  paymentMethod?: TripPaymentMethod;

  @ApiProperty({
    description: 'Participants to add in a single request',
    type: [Participant],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => Participant)
  participants!: Participant[];
}