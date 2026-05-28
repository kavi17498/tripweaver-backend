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
    requesterRole?: string,
  ): Promise<{
    status: 'success';
    assigned: string[];
    failed: Array<{ userId: string; reason: string }>;
  }> {
    const auth = this.firebaseService.getAuth();

    const requestedRole = role?.trim().toLowerCase();

    // Verify current user permission.
    try {
      const currentUser = await auth.getUser(currentUid);
      const currentRole = (currentUser.customClaims?.role || requesterRole || '').toString().toLowerCase();
      const canAssignGuide = requestedRole === 'guide' && (currentRole === 'admin' || currentRole === 'superadmin');
      const canAssignUser = requestedRole === 'user' && (currentRole === 'admin' || currentRole === 'superadmin');
      const canAssignOthers = currentRole === 'superadmin';

      if (!canAssignGuide && !canAssignUser && !canAssignOthers) {
        throw new ForbiddenException(
          'Only superadmin users can assign roles. Admin can assign user or guide roles only.',
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

      throw new InternalServerErrorException('Failed to verify user role permissions');
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
    const db = this.firebaseService.getFirestore();

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

        const nextUserUpdate: Record<string, unknown> = {
          updatedAt: new Date(),
          isVerified: requestedRole === 'user' ? false : true,
        };

        await db.collection(this.collectionName).doc(userId).set(nextUserUpdate, { merge: true });

        if (requestedRole === 'guide') {
          await db.collection('usertogudieLogs').add({
            userId,
            assignedBy: currentUid,
            role: 'guide',
            createdAt: new Date(),
          });
        }

        if (requestedRole === 'user') {
          const notificationsCollection = db.collection('notifications');
          await notificationsCollection.add({
            userId,
            type: 'account-alert',
            title: 'Role changed to user',
            description: 'Your account role has been changed to user and verification has been reset to false by an admin.',
            read: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

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

  private toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return value;
    }

    if (
      value &&
      typeof value === 'object' &&
      'toDate' in value &&
      typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
      return (value as { toDate: () => Date }).toDate();
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  /**
   * Get public profile and organized trips for an organizer
   */
  async getOrganizerPublicProfile(id: string): Promise<any> {
    const db = this.firebaseService.getFirestore();

    // 1. Get organizer user document
    const userDoc = await db.collection(this.collectionName).doc(id).get();
    if (!userDoc.exists) {
      throw new NotFoundException(`Organizer with ID ${id} not found`);
    }

    const userData = userDoc.data() || {};
    const organizer = {
      id: userDoc.id,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      profileImage: userData.profileImage || '',
      bio: userData.bio || '',
      city: userData.city || '',
      country: userData.country || '',
      isVerified: userData.isVerified || false,
      createdAt: this.toDate(userData.createdAt),
      languagesSpoken: userData.languagesSpoken || [],
      socialLinks: userData.socialLinks || {},
      tripPhotos: userData.tripPhotos || [],
      coverImage: userData.coverImage || '',
      website: userData.website || '',
      specializations: userData.specializations || [],
    };

    // 2. Fetch the trips organized by this user
    const tripsSnapshot = await db
      .collection('trips')
      .where('organizer', '==', id)
      .get();

    const trips: any[] = [];

    tripsSnapshot.forEach((doc) => {
      const data = doc.data() || {};
      // Skip private trips
      if (data.tripCategory !== 'Private trip') {
        trips.push({
          id: doc.id,
          ...data,
          createdAt: this.toDate(data.createdAt),
          updatedAt: this.toDate(data.updatedAt),
          statusUpdatedAt: this.toDate(data.statusUpdatedAt),
        });
      }
    });

    // 3. Fetch reviews for these trips
    const tripsWithReviews = await Promise.all(
      trips.map(async (trip) => {
        const reviewsSnapshot = await db
          .collection('reviews')
          .where('tripId', '==', trip.id)
          .get();

        const reviews: any[] = [];
        let totalRating = 0;

        reviewsSnapshot.forEach((rDoc) => {
          const rData = rDoc.data() || {};
          const mappedReview = {
            id: rDoc.id,
            ...rData,
            createdAt: this.toDate(rData.createdAt),
            updatedAt: this.toDate(rData.updatedAt || rData.createdAt),
          };
          reviews.push(mappedReview);
          totalRating += Number(rData.rating || 0);
        });

        // Sort reviews by date descending
        reviews.sort((a, b) => {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt ? b.createdAt.getTime() : 0;
          return bTime - aTime;
        });

        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

        return {
          ...trip,
          reviews,
          averageRating: parseFloat(averageRating.toFixed(1)),
          reviewCount: reviews.length,
        };
      })
    );

    // Calculate overall organizer statistics
    const allReviews = tripsWithReviews.flatMap((t) => t.reviews);
    const overallRating =
      allReviews.length > 0
        ? parseFloat(
            (
              allReviews.reduce((sum, r) => sum + r.rating, 0) /
              allReviews.length
            ).toFixed(1),
          )
        : null;

    return {
      organizer,
      trips: tripsWithReviews,
      overallRating,
      totalReviews: allReviews.length,
    };
  }

  /**
   * Get all organizers (verified guides)
   */
  async findAllOrganizers(): Promise<User[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collectionName)
      .where('isVerified', '==', true)
      .get();

    const users: User[] = [];
    const auth = this.firebaseService.getAuth();

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;
      try {
        const authUser = await auth.getUser(userId);
        const role = authUser.customClaims?.role;
        if (role === 'guide' || role === 'admin' || role === 'superadmin') {
          users.push({ id: userId, ...userData } as User);
        }
      } catch (err) {
        users.push({ id: userId, ...userData } as User);
      }
    }

    return users;
  }
}
