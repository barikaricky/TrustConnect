import { db, User, Database } from '../database/connection';

export { User };

export class UserService {
  static async findByPhone(phone: string): Promise<User | null> {
    db.read();
    const data = db.data as Database;
    return data.users.find((u: User) => u.phone === phone) || null;
  }

  static async createUser(phone: string, name: string, role: 'customer' | 'artisan'): Promise<User> {
    db.read();
    const data = db.data as Database;

    const user: User = {
      id: data._meta.nextUserId++,
      phone,
      name,
      role,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.users.push(user);
    db.write();

    return user;
  }

  static async verifyUser(userId: number): Promise<void> {
    db.read();
    const data = db.data as Database;
    const user = data.users.find((u: User) => u.id === userId);
    if (user) {
      user.verified = true;
      user.updatedAt = new Date().toISOString();
      db.write();
    }
  }

  static async findById(userId: number): Promise<User | null> {
    db.read();
    const data = db.data as Database;
    return data.users.find((u: User) => u.id === userId) || null;
  }
}
