import { db, User } from '../database/connection';

export { User };

export class UserService {
  static async findByPhone(phone: string): Promise<User | null> {
    await db.read();
    return db.data!.users.find(u => u.phone === phone) || null;
  }
  
  static async createUser(phone: string, name: string, role: 'customer' | 'artisan'): Promise<User> {
    await db.read();
    
    const user: User = {
      id: db.data!._meta.nextUserId++,
      phone,
      name,
      role,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    db.data!.users.push(user);
    await db.write();
    
    return user;
  }
  
  static async verifyUser(userId: number): Promise<void> {
    await db.read();
    const user = db.data!.users.find(u => u.id === userId);
    if (user) {
      user.verified = true;
      user.updatedAt = new Date().toISOString();
      await db.write();
    }
  }
  
  static async findById(userId: number): Promise<User | null> {
    await db.read();
    return db.data!.users.find(u => u.id === userId) || null;
  }
}
