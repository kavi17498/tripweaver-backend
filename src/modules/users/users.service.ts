import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly collectionName = 'users';

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const db = this.firebaseService.getFirestore();
    const userDocRef = db.collection(this.collectionName).doc(createUserDto.id);

    // Check if user with this ID already exists
    const existingById = await userDocRef.get();
    if (existingById.exists) {
      throw new ConflictException('User with this ID already exists');
    }

    // Check if user with email already exists
    const existingUser = await db
      .collection(this.collectionName)
      .where('email', '==', createUserDto.email)
      .get();

    if (!existingUser.empty) {
      throw new ConflictException('User with this email already exists');
    }

    const newUser: User = {
      ...createUserDto,
      isVerified: createUserDto.isVerified || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userDocRef.set(newUser);

    return { ...newUser, id: createUserDto.id };
  }

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collectionName).get();

    const users: User[] = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });

    return users;
  }

  /**
   * Get a single user by ID
   */
  async findOne(id: string): Promise<User> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collectionName).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return { id: doc.id, ...doc.data() } as User;
  }

  /**
   * Get a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collectionName)
      .where('email', '==', email)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  /**
   * Update a user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const db = this.firebaseService.getFirestore();

    // Check if user exists
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if email is being changed and if it already exists
    if (updateUserDto.email) {
      const existingUser = await db
        .collection(this.collectionName)
        .where('email', '==', updateUserDto.email)
        .get();

      if (
        !existingUser.empty &&
        existingUser.docs[0].id !== id
      ) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updateData = {
      ...updateUserDto,
      updatedAt: new Date(),
    };

    await db.collection(this.collectionName).doc(id).update(updateData);

    return this.findOne(id);
  }

  /**
   * Delete a user
   */
  async remove(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();

    // Check if user exists
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await db.collection(this.collectionName).doc(id).delete();
  }

  /**
   * Get verified users
   */
  async findVerified(): Promise<User[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collectionName)
      .where('isVerified', '==', true)
      .get();

    const users: User[] = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });

    return users;
  }

  /**
   * Return current user role from Firebase custom claims
   */
  async getCurrentUserRole(uid: string): Promise<{ role: string | null }> {
    const auth = this.firebaseService.getAuth();

    try {
      const user = await auth.getUser(uid);
      const role =
        typeof user.customClaims?.role === 'string'
          ? user.customClaims.role
          : null;

      return { role };
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };

      if (firebaseError?.code === 'auth/user-not-found') {
        throw new NotFoundException(`Auth user with ID ${uid} not found`);
      }

      throw new InternalServerErrorException('Failed to fetch current user role');
    }
  }

  /**
   * Set role=superadmin in Firebase custom claims for a specific UID
   */
  async setSelfAsSuperadmin(uid: string): Promise<{ status: 'success' }> {
    const auth = this.firebaseService.getAuth();

    try {
      const user = await auth.getUser(uid);
      const currentCustomClaims = user.customClaims || {};

      await auth.setCustomUserClaims(uid, {
        ...currentCustomClaims,
        role: 'superadmin',
      });

      return { status: 'success' };
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };

      if (firebaseError?.code === 'auth/user-not-found') {
        throw new NotFoundException(`Auth user with ID ${uid} not found`);
      }

      throw new InternalServerErrorException(
        'Failed to set superadmin custom claim',
      );
    }
  }

  /**
   * Assign role to one or multiple users (superadmin only)
   * Current user must have role=superadmin in their custom claims
   * Current user is skipped (keeps their superadmin role)
   */
  async assignRolesToUsers(
    currentUid: string,
    userIdsInput: string[] | string | undefined,
    role: string,
  ): Promise<{
    status: 'success';
    assigned: string[];
    failed: Array<{ userId: string; reason: string }>;
  }> {
    const auth = this.firebaseService.getAuth();

    // Verify current user is superadmin
    try {
      const currentUser = await auth.getUser(currentUid);
      const currentRole = currentUser.customClaims?.role;

      if (currentRole !== 'superadmin') {
        throw new ForbiddenException(
          'Only superadmin users can assign roles to other users',
        );
      }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };

      if (firebaseError?.code === 'auth/user-not-found') {
        throw new NotFoundException(`Current auth user ${currentUid} not found`);
      }

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to verify superadmin status');
    }

    // Validate role is a non-empty string
    if (!role || typeof role !== 'string' || role.trim().length === 0) {
      throw new BadRequestException('Role must be a non-empty string');
    }

    const userIds = Array.isArray(userIdsInput)
      ? userIdsInput
      : typeof userIdsInput === 'string'
        ? [userIdsInput]
        : [];

    const normalizedUserIds = [
      ...new Set(
        userIds
          .map((userId) => userId?.trim())
          .filter((userId): userId is string => !!userId),
      ),
    ];

    if (normalizedUserIds.length === 0) {
      throw new BadRequestException('userIds must contain at least one user ID');
    }

    const assigned: string[] = [];
    const failed: Array<{ userId: string; reason: string }> = [];

    for (const userId of normalizedUserIds) {
      // Skip current user - keep them as superadmin
      if (userId === currentUid) {
        continue;
      }

      try {
        const user = await auth.getUser(userId);
        const existingClaims = user.customClaims || {};

        await auth.setCustomUserClaims(userId, {
          ...existingClaims,
          role: role.trim(),
        });

        assigned.push(userId);
      } catch (error: unknown) {
        const firebaseError = error as { code?: string };

        let reason = 'Unknown error';
        if (firebaseError?.code === 'auth/user-not-found') {
          reason = 'User not found in Firebase Auth';
        } else if (firebaseError instanceof Error) {
          reason = firebaseError.message;
        }

        failed.push({ userId, reason });
      }
    }

    return {
      status: 'success',
      assigned,
      failed,
    };
  }
}
