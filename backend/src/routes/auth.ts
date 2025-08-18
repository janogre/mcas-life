import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ValidationError, AuthenticationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Temporary in-memory user storage (replace with database later)
const users: Array<{
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}> = [];

// Helper function to generate JWT token
function generateToken(user: { id: string; email: string; name: string }): string {
  if (!process.env['JWT_SECRET']) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    process.env['JWT_SECRET'],
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const userData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new ValidationError('User with this email already exists');
    }
    
    // Hash password
    const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);
    
    // Create user
    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: userData.email,
      name: userData.name,
      passwordHash,
      createdAt: new Date()
    };
    
    users.push(newUser);
    
    // Generate token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          createdAt: newUser.createdAt
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const loginData = loginSchema.parse(req.body);
    
    // Find user
    const user = users.find(u => u.email === loginData.email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(loginData.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }
    
    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-token
router.post('/verify-token', (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      throw new ValidationError('Token is required');
    }
    
    if (!process.env['JWT_SECRET']) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const decoded = jwt.verify(token, process.env['JWT_SECRET']) as {
      id: string;
      email: string;
      name: string;
    };
    
    // Find user to ensure they still exist
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me (requires auth header)
router.get('/me', (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }
    
    const token = authHeader.substring(7);
    
    if (!process.env['JWT_SECRET']) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const decoded = jwt.verify(token, process.env['JWT_SECRET']) as {
      id: string;
      email: string;
      name: string;
    };
    
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };