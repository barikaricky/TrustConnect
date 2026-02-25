import { collections, getNextSequence, User } from '../database/connection';

export { User };

export class UserService {
  static async findByPhone(phone: string): Promise<User | null> {
    return await collections.users().findOne({ phone });
  }

  static async createUser(
    phone: string, 
    name: string, 
    role: 'customer' | 'artisan',
    password?: string,
    email?: string,
    location?: any
  ): Promise<User> {
    // Retry loop to handle counter sync issues (duplicate id)
    let attempts = 0;
    while (attempts < 5) {
      const id = await getNextSequence('userId');
      
      const user: User = {
        id,
        phone,
        name,
        role,
        verified: false,
        password,
        email,
        location: location?.address || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await collections.users().insertOne(user);
        return user;
      } catch (err: any) {
        // If duplicate key on id field, bump counter and retry
        if (err.code === 11000 && err.keyPattern?.id) {
          attempts++;
          console.warn(`⚠️ userId ${id} already exists, retrying (attempt ${attempts})...`);
          continue;
        }
        throw err; // Other errors (e.g. duplicate phone) bubble up
      }
    }
    throw new Error('Failed to generate unique userId after 5 attempts');
  }

  static async verifyUser(userId: number): Promise<void> {
    await collections.users().updateOne(
      { id: userId },
      {
        $set: {
          verified: true,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  }

  static async findById(userId: number): Promise<User | null> {
    return await collections.users().findOne({ id: userId });
  }

  static async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await collections.users().updateOne(
      { id: userId },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  }
}
