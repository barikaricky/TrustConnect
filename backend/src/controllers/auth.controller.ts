import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UserService } from '../services/user.service';
import { OTPService } from '../services/otp.service';
import { JWTService } from '../services/jwt.service';
import { collections } from '../database/connection';
import { ensureUniqueCode } from './referral.controller';

/**
 * Authentication Controller
 * Handles user registration, login, and OTP verification
 */

export class AuthController {
  /**
   * POST /api/auth/register
   * Register with password (new flow)
   */
  static async register(req: Request, res: Response) {
    try {
      const { phone, name, fullName, role, password, email, location, referralCode: inviteCode } = req.body;
      const userName = name || fullName; // Accept both 'name' and 'fullName'
      
      // Validate input
      if (!phone || !userName || !role) {
        return res.status(400).json({
          success: false,
          message: 'Phone, name, and role are required',
        });
      }
      
      if (!['customer', 'artisan', 'company'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role must be customer, artisan, or company',
        });
      }
      
      // Check if user already exists
      const existingUser = await UserService.findByPhone(phone);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this phone number already exists',
        });
      }
      
      // Hash password if provided
      let hashedPassword;
      if (password) {   
        hashedPassword = await bcrypt.hash(password, 10);
      }
      
      // Create user with password and location
      const user = await UserService.createUser(phone, userName, role, hashedPassword, email, location);
      
      // Generate a unique referral code for the new user
      const newUserReferralCode = await ensureUniqueCode();
      const referralUpdate: Record<string, any> = {
        referralCode: newUserReferralCode,
        updatedAt: new Date().toISOString(),
      };

      // If an invite code was provided, link the referrer
      if (inviteCode) {
        const referrer = await collections.users().findOne({ referralCode: inviteCode.toUpperCase() });
        if (referrer && referrer.id !== user.id) {
          referralUpdate.referredBy = referrer.id;
          referralUpdate.referralRewardClaimed = false;
        }
      }

      await collections.users().updateOne({ id: user.id }, { $set: referralUpdate });
      
      // Mark user as verified (skip OTP for password registration)
      await UserService.verifyUser(user.id);
      
      // Generate JWT token immediately
      const token = JWTService.generateToken({
        userId: user.id,
        phone: user.phone,
        role: user.role,
      });
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          token,
          user: {
            id: user.id,
            phone: user.phone,
            fullName: user.name,
            name: user.name,
            email: email || undefined,
            role: user.role,
            isVerified: true,
            referralCode: newUserReferralCode,
          },
          userId: user.id,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      // Duplicate phone (not caught above if race condition)
      if (error.code === 11000 && error.keyPattern?.phone) {
        return res.status(409).json({
          success: false,
          message: 'User with this phone number already exists',
        });
      }
      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }
  
  /**
   * POST /api/auth/login
   * Login with password
   */
  static async login(req: Request, res: Response) {
    try {
      const { phone, password } = req.body;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
        });
      }
      
      // Check if user exists
      const user = await UserService.findByPhone(phone);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please register first.',
        });
      }
      
      // If password provided, verify it
      if (password) {
        if (!user.password) {
          return res.status(400).json({
            success: false,
            message: 'Password not set for this account. Please use OTP login.',
          });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            message: 'Incorrect password',
          });
        }
        
        // Password is valid, generate token
        const token = JWTService.generateToken({
          userId: user.id,
          phone: user.phone,
          role: user.role,
        });
        
        return res.status(200).json({
          success: true,
          message: 'Login successful',
          data: {
            token,
            user: {
              id: user.id,
              phone: user.phone,
              fullName: user.name,
              name: user.name,
              email: user.email,
              role: user.role,
              isVerified: user.verified,
            },
          },
        });
      }
      
      // No password provided, use OTP flow
      const otp = await OTPService.generateOTP(phone);
      
      res.status(200).json({
        success: true,
        message: 'OTP sent to phone.',
        data: {
          userId: user.id,
          phone: user.phone,
          otpMock: otp, // MVP: Return OTP for testing
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
      });
    }
  }
  
  /**
   * POST /api/auth/verify-otp
   * Verify OTP and issue JWT token
   */
  static async verifyOTP(req: Request, res: Response) {
    try {
      const { phone, otp } = req.body;
      
      if (!phone || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Phone and OTP are required',
        });
      }
      
      // Verify OTP
      const isValid = await OTPService.verifyOTP(phone, otp);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired OTP',
        });
      }
      
      // Get user (may not exist for new registration flows)
      const user = await UserService.findByPhone(phone);
      if (!user) {
        // OTP is valid but user hasn't registered yet - return success for registration flow
        return res.status(200).json({
          success: true,
          message: 'OTP verified. Please complete registration.',
          data: {
            phone,
            verified: true,
            userExists: false,
          },
        });
      }
      
      // Mark user as verified
      await UserService.verifyUser(user.id);
      
      // Generate JWT token
      const token = JWTService.generateToken({
        userId: user.id,
        phone: user.phone,
        role: user.role,
      });
      
      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
          token,
          user: {
            id: user.id,
            phone: user.phone,
            fullName: user.name,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: true,
            verified: true,
          },
        },
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'OTP verification failed',
      });
    }
  }
  
  /**
   * POST /api/auth/send-otp
   * Send OTP to any phone number (works for both new and existing users)
   */
  static async sendOTP(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
        });
      }
      
      // Generate and store OTP (works for any phone)
      const otp = await OTPService.generateOTP(phone);
      
      // Check if user exists (for informational purposes)
      const user = await UserService.findByPhone(phone);
      
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          phone,
          otpMock: otp, // MVP: Return OTP for testing
          userExists: !!user,
        },
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP',
      });
    }
  }

  /**
   * POST /api/auth/set-password
   * Set or update password for existing user
   */
  static async setPassword(req: Request, res: Response) {
    try {
      const { phone, password, otp } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({
          success: false,
          message: 'Phone and password are required',
        });
      }
      
      const user = await UserService.findByPhone(phone);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      
      // Hash and save password
      const hashedPassword = await bcrypt.hash(password, 10);
      await UserService.updatePassword(user.id, hashedPassword);
      
      // Generate new token
      const token = JWTService.generateToken({
        userId: user.id,
        phone: user.phone,
        role: user.role,
      });
      
      res.status(200).json({
        success: true,
        message: 'Password set successfully',
        data: {
          token,
          user: {
            id: user.id,
            phone: user.phone,
            fullName: user.name,
            name: user.name,
            role: user.role,
            isVerified: user.verified,
          },
        },
      });
    } catch (error) {
      console.error('Set password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set password',
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user info (requires authentication)
   */
  static async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      
      const user = await UserService.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role,
            verified: user.verified,
          },
        },
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user data',
      });
    }
  }
}
