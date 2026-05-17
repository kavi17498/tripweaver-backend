import { PartialType } from '@nestjs/swagger';
import { Participant } from '../entities/participant.entity';

export class UpdateParticipantDto extends PartialType(Participant) {}