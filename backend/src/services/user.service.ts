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

    await collections.users().insertOne(user);
    return user;
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
}
