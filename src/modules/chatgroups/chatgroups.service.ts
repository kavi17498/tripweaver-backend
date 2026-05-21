import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ChatGroup } from './entities/chatgroup.entity';
import { CreateChatGroupDto } from './dto/create-chatgroup.dto';
import { UpdateChatGroupDto } from './dto/update-chatgroup.dto';

@Injectable()
export class ChatGroupsService {
  private readonly collectionName = 'chatgroups';

  constructor(private firebaseService: FirebaseService) {}

  private getCollection() {
    return this.firebaseService.getFirestore().collection(this.collectionName);
  }

  /**
   * Create a new chat group
   */
  async create(createChatGroupDto: CreateChatGroupDto): Promise<ChatGroup> {
    const db = this.firebaseService.getFirestore();
    const now = new Date();

    const existing = await this.findByTripId(createChatGroupDto.tripId);
    if (existing.length > 0) {
      return existing[0];
    }

    const newChatGroup: ChatGroup = {
      ...createChatGroupDto,
      members: createChatGroupDto.members ?? [createChatGroupDto.adminId],
      lastMessage: '',
      lastMessageAt: now,
      unreadCounts: {},
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(this.collectionName).add(newChatGroup);
    const id = docRef.id;

    return { ...newChatGroup, id };
  }

  async ensureTripChatGroup(input: {
    tripId: string;
    name: string;
    adminId: string;
    adminName: string;
    description?: string;
    members?: string[];
  }): Promise<ChatGroup> {
    const existing = await this.findByTripId(input.tripId);
    if (existing.length > 0) {
      const group = existing[0];
      const mergedMembers = Array.from(new Set([...(group.members ?? []), ...(input.members ?? []), input.adminId].filter(Boolean)));

      if (mergedMembers.length !== (group.members ?? []).length) {
        await this.firebaseService.getFirestore().collection(this.collectionName).doc(group.id!).update({
          members: mergedMembers,
          updatedAt: new Date(),
        });

        return this.findOne(group.id!);
      }

      return group;
    }

    return this.create({
      tripId: input.tripId,
      name: input.name,
      adminId: input.adminId,
      adminName: input.adminName,
      description: input.description,
      members: Array.from(new Set([...(input.members ?? []), input.adminId].filter(Boolean))),
    });
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
   * Get chat groups where the user is the admin or a member
   */
  async findForUser(userId: string): Promise<ChatGroup[]> {
    const collection = this.getCollection();

    const adminQuerySnapshot = await collection.where('adminId', '==', userId).get();
    const memberQuerySnapshot = await collection.where('members', 'array-contains', userId).get();

    const map = new Map<string, ChatGroup>();

    adminQuerySnapshot.forEach((doc) => {
      map.set(doc.id, { id: doc.id, ...doc.data() } as ChatGroup);
    });

    memberQuerySnapshot.forEach((doc) => {
      map.set(doc.id, { id: doc.id, ...doc.data() } as ChatGroup);
    });

    return Array.from(map.values());
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
    const snapshot = await this.getCollection()
      .where('tripId', '==', tripId)
      .get();

    const chatGroups: ChatGroup[] = [];
    snapshot.forEach((doc) => {
      chatGroups.push({ id: doc.id, ...doc.data() } as ChatGroup);
    });

    return chatGroups;
  }

  async findOneByTripId(tripId: string): Promise<ChatGroup | null> {
    const chatGroups = await this.findByTripId(tripId);
    return chatGroups[0] ?? null;
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

  async addMembers(chatGroupId: string, userIds: string[]): Promise<ChatGroup> {
    const uniqueUserIds = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
    if (uniqueUserIds.length === 0) {
      return this.findOne(chatGroupId);
    }

    const chatGroup = await this.findOne(chatGroupId);
    const updatedMembers = Array.from(new Set([...(chatGroup.members || []), ...uniqueUserIds]));

    if (updatedMembers.length === (chatGroup.members || []).length) {
      return chatGroup;
    }

    await this.firebaseService.getFirestore().collection(this.collectionName).doc(chatGroupId).update({
      members: updatedMembers,
      updatedAt: new Date(),
    });

    return this.findOne(chatGroupId);
  }

  async markRead(chatGroupId: string, userId: string): Promise<ChatGroup> {
    const docRef = this.getCollection().doc(chatGroupId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new NotFoundException(`Chat group with ID ${chatGroupId} not found`);

    const data: any = docSnap.data();
    const unread: Record<string, number> = data?.unreadCounts ?? {};
    if (unread[userId]) {
      unread[userId] = 0;
      await docRef.update({ unreadCounts: unread, updatedAt: new Date() });
    }

    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() } as ChatGroup;
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
