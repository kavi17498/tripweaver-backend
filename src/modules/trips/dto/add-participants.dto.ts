import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Participant } from '../entities/participant.entity';

export class AddParticipantsDto {
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