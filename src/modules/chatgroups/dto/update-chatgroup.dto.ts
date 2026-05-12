import { PartialType } from '@nestjs/swagger';
import { CreateChatGroupDto } from './create-chatgroup.dto';

export class UpdateChatGroupDto extends PartialType(CreateChatGroupDto) {}
