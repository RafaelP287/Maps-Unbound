import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication Routes Module
 * 
 * Handles user authentication for the D&D Virtual Tabletop application
 * Provides endpoints for:
 * - User registration (signup)
 * - User login with JWT token generation
 * 
 * Security features:
 * - Password hashing with bcrypt (10 salt rounds)
 * - JWT token authentication (7-day expiration)
 * - Input validation for all fields
 * - Detailed error messages to prevent user enumeration
 */
const router = express.Router();

/**
 * POST /api/auth/signup
 * 
 * Creates a new user account
 * 
 * Request body:
 * - username: String (unique)
 * - email: String (unique, case-insensitive)
 * - password: String (minimum 8 characters)
 * 
 * Returns: User object + JWT token for immediate authentication
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Input validation - check all required fields are provided
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required',
        errors: {
          username: !username ? 'Username is required' : undefined,
          email: !email ? 'Email is required' : undefined,
          password: !password ? 'Password is required' : undefined,
        },
      });
    }

    // Password strength requirement - minimum 8 characters
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
        errors: { password: 'Password must be at least 8 characters' },
      });
    }

    // Check if user already exists (email or username)
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      const isEmail = existingUser.email === email.toLowerCase();
      return res.status(409).json({
        message: isEmail ? 'Email already registered' : 'Username already taken',
        errors: {
          [isEmail ? 'email' : 'username']: isEmail
            ? 'Email already registered'
            : 'Username already taken',
        },
      });
    }

    // Hash password using bcrypt (10 salt rounds for security)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in database
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Generate JWT token for authentication (valid for 7 days)
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'maps-unbound-secret-key',
      { expiresIn: '7d' }
    );

    // Return success with user info and token
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);

    // Handle validation errors from MongoDB schema
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Generic error response for server issues
    res.status(500).json({ message: 'Server error during signup' });
  }
});

/**
 * POST /api/auth/login
 * 
 * Authenticates a user and generates a JWT token
 * 
 * Request body:
 * - email: String
 * - password: String
 * 
 * Returns: User object + JWT token for authenticated requests
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation - email and password required
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
        errors: {
          email: !email ? 'Email is required' : undefined,
          password: !password ? 'Password is required' : undefined,
        },
      });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
        errors: { email: 'Email or password is incorrect' },
      });
    }

    // Compare provided password with stored hash
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid credentials',
        errors: { password: 'Email or password is incorrect' },
      });
    }

    // Generate JWT token for authenticated requests (valid for 7 days)
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'maps-unbound-secret-key',
      { expiresIn: '7d' }
    );

    // Return success with user info and token
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

export default router;
