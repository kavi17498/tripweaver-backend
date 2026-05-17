import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ChatGroup } from './entities/chatgroup.entity';
import { CreateChatGroupDto } from './dto/create-chatgroup.dto';
import { UpdateChatGroupDto } from './dto/update-chatgroup.dto';

@Injectable()
export class ChatGroupsService {
  private readonly collectionName = 'chatgroups';

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Create a new chat group
   */
  async create(createChatGroupDto: CreateChatGroupDto): Promise<ChatGroup> {
    const db = this.firebaseService.getFirestore();

    const newChatGroup: ChatGroup = {
      ...createChatGroupDto,
      members: createChatGroupDto.members ?? [createChatGroupDto.adminId],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(this.collectionName).add(newChatGroup);
    const id = docRef.id;

    return { ...newChatGroup, id };
  }

  /**
   * Get all chat groups
   */
  async findAll(): Promise<ChatGroup[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collectionName).get();

    const chatGroups: ChatGroup[] = [];
    snapshot.forEach((doc) => {
      chatGroups.push({ id: doc.id, ...doc.data() } as ChatGroup);
    });

    return chatGroups;
  }

  /**
   * Get a single chat group by ID
   */
  async findOne(id: string): Promise<ChatGroup> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collectionName).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Chat group with ID ${id} not found`);
    }

    return { id: doc.id, ...doc.data() } as ChatGroup;
  }

  /**
   * Get chat groups by trip ID
   */
  async findByTripId(tripId: string): Promise<ChatGroup[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collectionName)
      .where('tripId', '==', tripId)
      .get();

    const chatGroups: ChatGroup[] = [];
    snapshot.forEach((doc) => {
      chatGroups.push({ id: doc.id, ...doc.data() } as ChatGroup);
    });

    return chatGroups;
  }

  /**
   * Update a chat group
   */
  async update(id: string, updateChatGroupDto: UpdateChatGroupDto): Promise<ChatGroup> {
    const db = this.firebaseService.getFirestore();

    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Chat group with ID ${id} not found`);
    }

    const updateData = {
      ...updateChatGroupDto,
      updatedAt: new Date(),
    };

    await db.collection(this.collectionName).doc(id).update(updateData);

    return this.findOne(id);
  }

  /**
   * Delete a chat group
   */
  async remove(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();

    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Chat group with ID ${id} not found`);
    }

    await db.collection(this.collectionName).doc(id).delete();
  }

  /**
   * Add a member to a chat group
   */
  async addMember(chatGroupId: string, userId: string): Promise<ChatGroup> {
    const db = this.firebaseService.getFirestore();
    const chatGroup = await this.findOne(chatGroupId);

    if (chatGroup.members && chatGroup.members.includes(userId)) {
      throw new BadRequestException('User is already a member of this chat group');
    }

    const updatedMembers = [...(chatGroup.members || []), userId];

    await db.collection(this.collectionName).doc(chatGroupId).update({
      members: updatedMembers,
      updatedAt: new Date(),
    });

    return this.findOne(chatGroupId);
  }

  /**
   * Remove a member from a chat group
   */
  async removeMember(chatGroupId: string, userId: string): Promise<ChatGroup> {
    const db = this.firebaseService.getFirestore();
    const chatGroup = await this.findOne(chatGroupId);

    if (!chatGroup.members || !chatGroup.members.includes(userId)) {
      throw new BadRequestException('User is not a member of this chat group');
    }

    const updatedMembers = chatGroup.members.filter((id) => id !== userId);

    await db.collection(this.collectionName).doc(chatGroupId).update({
      members: updatedMembers,
      updatedAt: new Date(),
    });

    return this.findOne(chatGroupId);
  }
}
