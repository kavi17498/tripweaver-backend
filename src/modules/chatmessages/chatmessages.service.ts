import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ChatGroupsService } from '../chatgroups/chatgroups.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { ChatMessageEntity } from './entities/chat-message.entity';

@Injectable()
export class ChatMessagesService {
  private readonly collectionName = 'chatmessages';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly chatGroupsService: ChatGroupsService,
  ) {}

  async findByChatGroupId(chatGroupId: string): Promise<ChatMessageEntity[]> {
    const db = this.firebaseService.getFirestore();
    // Avoid composite index requirement by fetching matching documents
    // and sorting in-memory by `createdAt`. This keeps chronological
    // order without requiring a Firestore composite index.
    const snapshot = await db.collection(this.collectionName).where('chatGroupId', '==', chatGroupId).get();

    const messages: ChatMessageEntity[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as any;

      // Normalize Firestore Timestamp to JS Date when possible
      const createdAt = data?.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate()
        : data?.createdAt ? new Date(data.createdAt) : new Date(0);

      const updatedAt = data?.updatedAt && typeof data.updatedAt.toDate === 'function'
        ? data.updatedAt.toDate()
        : data?.updatedAt ? new Date(data.updatedAt) : createdAt;

      messages.push({
        id: doc.id,
        ...data,
        createdAt,
        updatedAt,
      } as ChatMessageEntity);
    });

    // Sort chronologically
    messages.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));

    return messages;
  }

  async create(chatGroupId: string, dto: CreateChatMessageDto): Promise<ChatMessageEntity> {
    const db = this.firebaseService.getFirestore();
    const chatGroup = await this.chatGroupsService.findOne(chatGroupId);

    if (!chatGroup.members || !chatGroup.members.includes(dto.senderId)) {
      throw new BadRequestException('You are not a member of this chat group.');
    }

    const messageText = dto.message?.trim() ?? '';
    const imageUrl = dto.imageUrl?.trim() ?? '';

    if (!messageText && !imageUrl) {
      throw new BadRequestException('Message text or image is required.');
    }

    const now = new Date();
    const message: ChatMessageEntity = {
      chatGroupId,
      tripId: chatGroup.tripId,
      senderId: dto.senderId,
      senderName: dto.senderName,
      ...(messageText ? { message: messageText } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(this.collectionName).add(message);
    return { ...message, id: docRef.id };
  }

  async ensureChatGroupExists(chatGroupId: string): Promise<void> {
    try {
      await this.chatGroupsService.findOne(chatGroupId);
    } catch {
      throw new NotFoundException(`Chat group with ID ${chatGroupId} not found`);
    }
  }
}
