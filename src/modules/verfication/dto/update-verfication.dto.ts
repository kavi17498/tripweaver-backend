import { PartialType } from '@nestjs/swagger';
import { CreateVerficationDto } from './create-verfication.dto';

export class UpdateVerficationDto extends PartialType(CreateVerficationDto) {}
