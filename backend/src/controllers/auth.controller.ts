import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { OTPService } from '../services/otp.service';
import { JWTService } from '../services/jwt.service';

/**
 * Authentication Controller
 * Handles user registration, login, and OTP verification
 */

export class AuthController {
  /**
   * POST /api/auth/register
   * Initiate registration - create user and send OTP
   */
  static async register(req: Request, res: Response) {
    try {
      const { phone, name, role } = req.body;
      
      // Validate input
      if (!phone || !name || !role) {
        return res.status(400).json({
          success: false,
          message: 'Phone, name, and role are required',
        });
      }
      
      if (!['customer', 'artisan'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role must be either customer or artisan',
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
      
      // Create user
      const user = await UserService.createUser(phone, name, role);
      
      // Generate OTP
      const otp = await OTPService.generateOTP(phone);
      
      res.status(201).json({
        success: true,
        message: 'Registration initiated. OTP sent to phone.',
        data: {
          userId: user.id,
          phone: user.phone,
          otpMock: otp, // MVP: Return OTP for testing
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
      });
    }
  }
  
  /**
   * POST /api/auth/login
   * Initiate login - send OTP to existing user
   */
  static async login(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      
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
      
      // Generate OTP
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
      
      // Get user
      const user = await UserService.findByPhone(phone);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
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
            name: user.name,
            role: user.role,
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
