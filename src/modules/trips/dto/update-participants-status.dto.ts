import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsString } from 'class-validator';

export class UpdateParticipantsStatusDto {
  @ApiProperty({
    description: 'List of participant IDs to update',
    type: [String],
    example: ['part_1', 'part_2'],
  })
  @IsArray()
  @IsString({ each: true })
  participantIds!: string[];

  @ApiProperty({
    description: 'New status for the specified participants',
    enum: ['accepted', 'rejected'],
    example: 'accepted',
  })
  @IsIn(['accepted', 'rejected'])
  @IsString()
  status!: 'accepted' | 'rejected';
}
