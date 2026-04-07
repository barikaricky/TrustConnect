import { collections, getNextSequence, User } from '../database/connection';

export { User };

export class UserService {
  /**
   * Normalise any Nigerian phone format to +234XXXXXXXXXX.
   * Handles: +2348012345678 | 2348012345678 | 08012345678 | 8012345678
   */
  static normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-]/g, '');
    if (cleaned.startsWith('+234')) return cleaned;            // already canonical
    if (cleaned.startsWith('234'))  return '+' + cleaned;      // missing +
    if (cleaned.startsWith('0'))    return '+234' + cleaned.slice(1); // local 0xxxxxx
    return '+234' + cleaned;                                   // bare digits
  }

  /**
   * Look up user by phone – tries canonical form first, then the raw form,
   * so existing records stored without +234 are still found.
   */
  static async findByPhone(phone: string): Promise<User | null> {
    const canonical = UserService.normalizePhone(phone);
    // Try canonical (+234…) first, then exact input as fallback
    const user =
      await collections.users().findOne({ phone: canonical }) ??
      (canonical !== phone ? await collections.users().findOne({ phone }) : null);
    return user ?? null;
  }

  static async createUser(
    phone: string, 
    name: string, 
    role: 'customer' | 'artisan' | 'company',
    password?: string,
    email?: string,
    location?: any,
    accountType?: 'individual' | 'company'
  ): Promise<User> {
    // Always store phone in canonical +234 format
    const canonicalPhone = UserService.normalizePhone(phone);

    // Retry loop to handle counter sync issues (duplicate id)
    let attempts = 0;
    while (attempts < 5) {
      const id = await getNextSequence('userId');
      
      const user: User = {
        id,
        phone: canonicalPhone,
        name,
        role,
        accountType: accountType || (role === 'company' ? 'company' : 'individual'),
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
