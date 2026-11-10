const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticates user credentials using secure parameterized SQL and bcrypt
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Parameterized SQL query to prevent SQL Injection
    const user = await query.get(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.role_id, u.status, u.bio,
              r.name AS role, r.display_name AS role_display
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE LOWER(u.email) = LOWER(?)`,
      [email.trim()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      role_display: user.role_display,
      status: user.status,
      bio: user.bio
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      message: 'Login successful',
      token,
      user: payload
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/register
 * Creates a new user account (Customer or Book Author)
 * Note: Super Admin role is fixed/read-only and prohibited from registration
 */
router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, password, role, bio } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Role validation
    const requestedRole = (role || 'customer').toLowerCase().trim();
    if (requestedRole === 'superadmin' || requestedRole === 'admin') {
      return res.status(400).json({
        error: 'Forbidden: Super Admin role is read-only and cannot be registered publicly.'
      });
    }

    if (requestedRole !== 'customer' && requestedRole !== 'author') {
      return res.status(400).json({
        error: 'Invalid role selection. Must be either "customer" or "author".'
      });
    }

    // Check if user already exists
    const existing = await query.get(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // If author -> status is PENDING until approved by Super Admin; If customer -> APPROVED
    const roleId = requestedRole === 'author' ? 2 : 3;
    const initialStatus = requestedRole === 'author' ? 'PENDING' : 'APPROVED';

    const result = await query.run(
      `INSERT INTO users (full_name, email, password_hash, role_id, status, bio) VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name.trim(), email.trim().toLowerCase(), password_hash, roleId, initialStatus, bio || '']
    );

    const payload = {
      id: result.lastID,
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      role: requestedRole,
      role_display: requestedRole === 'author' ? 'Book Author' : 'General Customer',
      status: initialStatus,
      bio: bio || ''
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    const message = requestedRole === 'author'
      ? 'Author application submitted successfully! Your account is pending Super Admin approval before you can publish books.'
      : 'Account created successfully! Welcome to BookWorm.';

    res.status(201).json({
      message,
      token,
      user: payload
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await query.get(
      `SELECT u.id, u.full_name, u.email, u.role_id, u.status, u.bio, u.created_at,
              r.name AS role, r.display_name AS role_display
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        role_display: user.role_display,
        status: user.status,
        bio: user.bio,
        created_at: user.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/demo-users
 * Returns available demo accounts covering the 3 roles
 */
router.get('/demo-users', (req, res) => {
  res.json({
    accounts: [
      {
        role: 'superadmin',
        title: '👑 Super Admin (Sumit Dobriyal)',
        email: 'dobriyal.sumit@gmail.com',
        password: 'SuperAdmin@123',
        status: 'APPROVED',
        description: 'Super Administrator with full power to manage and approve authors'
      },
      {
        role: 'author',
        title: '✍️ Approved Author (Sam Newman)',
        email: 'sam.newman@bookworm.io',
        password: 'Author@123',
        status: 'APPROVED',
        description: 'Verified author who can add, edit, and remove books'
      },
      {
        role: 'author',
        title: '⏳ Pending Author (Jane Austen)',
        email: 'jane.austen@bookworm.io',
        password: 'Author@123',
        status: 'PENDING',
        description: 'Author application waiting for Super Admin approval'
      },
      {
        role: 'customer',
        title: '🛍️ General Customer (John Doe)',
        email: 'john.doe@example.com',
        password: 'User@123',
        status: 'APPROVED',
        description: 'Can browse catalog, purchase books, and submit star ratings'
      }
    ]
  });
});

module.exports = router;
