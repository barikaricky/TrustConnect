import db from '../database/connection';
import { User } from '../database/connection';

export { User };

export class UserService {
  static async findByPhone(phone: string): Promise<User | null> {
    return db.get('users').find({ phone }).value() || null;
  }

  static async createUser(phone: string, name: string, role: 'customer' | 'artisan'): Promise<User> {
    const userId = db.get('_meta.nextUserId').value();
    
    const user: User = {
      id: userId,
      phone,
      name,
      role,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.get('users').push(user).write();
    db.set('_meta.nextUserId', userId + 1).write();

    return user;
  }

  static async verifyUser(userId: number): Promise<void> {
    db.get('users')
      .find({ id: userId })
      .assign({
        verified: true,
        updatedAt: new Date().toISOString(),
      })
      .write();
  }

  static async findById(userId: number): Promise<User | null> {
    return db.get('users').find({ id: userId }).value() || null;
  }
}
