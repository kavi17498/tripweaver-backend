import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiNotFoundResponse, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ChatMessagesService } from './chatmessages.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { ChatMessageEntity } from './entities/chat-message.entity';

@ApiTags('chatmessages')
@ApiSecurity('firebase-token')
@Controller('chatgroups/:chatGroupId/messages')
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get chat messages', description: 'Return messages for a chat group in chronological order.' })
  @ApiParam({ name: 'chatGroupId', description: 'Chat group ID', example: 'chatgroup_12345' })
  @ApiResponse({ status: 200, description: 'Messages returned successfully', type: [ChatMessageEntity] })
  async findAll(@Param('chatGroupId') chatGroupId: string): Promise<ChatMessageEntity[]> {
    await this.chatMessagesService.ensureChatGroupExists(chatGroupId);
    return this.chatMessagesService.findByChatGroupId(chatGroupId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a chat message', description: 'Create a message in a chat group. Users must already be members.' })
  @ApiParam({ name: 'chatGroupId', description: 'Chat group ID', example: 'chatgroup_12345' })
  @ApiBody({ type: CreateChatMessageDto })
  @ApiResponse({ status: 201, description: 'Message created successfully', type: ChatMessageEntity })
  @ApiBadRequestResponse({ description: 'Invalid message or user is not a member' })
  @ApiNotFoundResponse({ description: 'Chat group not found' })
  async create(
    @Param('chatGroupId') chatGroupId: string,
    @Body() dto: CreateChatMessageDto,
  ): Promise<ChatMessageEntity> {
    await this.chatMessagesService.ensureChatGroupExists(chatGroupId);
    return this.chatMessagesService.create(chatGroupId, dto);
  }
}
