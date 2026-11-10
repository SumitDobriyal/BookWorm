const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { ROLES, ROLE_IDS, USER_STATUS } = require('../config/constants');

class AuthService {
  async login(email, password) {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.status = 400;
      throw err;
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
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

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      message: 'Login successful',
      token,
      user: payload
    };
  }

  async register({ full_name, email, password, role, bio }) {
    if (!full_name || !email || !password) {
      const err = new Error('Full name, email, and password are required');
      err.status = 400;
      throw err;
    }

    if (password.length < 6) {
      const err = new Error('Password must be at least 6 characters long');
      err.status = 400;
      throw err;
    }

    const requestedRole = (role || ROLES.CUSTOMER).toLowerCase().trim();
    if (requestedRole === ROLES.SUPERADMIN || requestedRole === 'admin') {
      const err = new Error('Forbidden: Super Admin role is read-only and cannot be registered publicly.');
      err.status = 400;
      throw err;
    }

    if (requestedRole !== ROLES.CUSTOMER && requestedRole !== ROLES.AUTHOR) {
      const err = new Error('Invalid role selection. Must be either "customer" or "author".');
      err.status = 400;
      throw err;
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.status = 409;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const role_id = requestedRole === ROLES.AUTHOR ? ROLE_IDS.AUTHOR : ROLE_IDS.CUSTOMER;
    const initialStatus = requestedRole === ROLES.AUTHOR ? USER_STATUS.PENDING : USER_STATUS.APPROVED;

    const createdUser = await userRepository.createUser({
      full_name,
      email,
      password_hash,
      role_id,
      status: initialStatus,
      bio
    });

    const payload = {
      id: createdUser.id,
      full_name: createdUser.full_name,
      email: createdUser.email,
      role: createdUser.role,
      role_display: createdUser.role_display,
      status: createdUser.status,
      bio: createdUser.bio
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const message = requestedRole === ROLES.AUTHOR
      ? 'Author application submitted successfully! Your account is pending Super Admin approval before you can publish books.'
      : 'Account created successfully! Welcome to BookWorm.';

    return {
      message,
      token,
      user: payload
    };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      role_display: user.role_display,
      status: user.status,
      bio: user.bio,
      created_at: user.created_at
    };
  }

  getDemoUsers() {
    return [
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
    ];
  }
}

module.exports = new AuthService();
