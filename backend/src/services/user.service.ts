import pool from '../database/connection';

export interface User {
  id: number;
  phone: string;
  name: string;
  role: 'customer' | 'artisan';
  verified: boolean;
  created_at: Date;
}

export class UserService {
  /**
   * Find user by phone number
   */
  static async findByPhone(phone: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );
    
    return result.rows[0] || null;
  }
  
  /**
   * Create new user
   */
  static async createUser(
    phone: string,
    name: string,
    role: 'customer' | 'artisan'
  ): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (phone, name, role, verified)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [phone, name, role, false]
    );
    
    return result.rows[0];
  }
  
  /**
   * Update user verification status
   */
  static async verifyUser(userId: number): Promise<void> {
    await pool.query(
      'UPDATE users SET verified = TRUE WHERE id = $1',
      [userId]
    );
  }
  
  /**
   * Get user by ID
   */
  static async findById(userId: number): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    return result.rows[0] || null;
  }
}
