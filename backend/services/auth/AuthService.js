const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const UserService = require("../UserService");
require("dotenv").config();

/**
 * Service for handling JWT authentication
 */
class AuthService {
  constructor() {
    this.CHANNEL_SELECTION_REQUIRES_ADMIN =
      process.env.CHANNEL_SELECTION_REQUIRES_ADMIN === "true";
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";
    this.JWT_SECRET = process.env.JWT_SECRET || this.generateSecureSecret();

    // Initialize default admin if no users exist
    this.initializeDefaultAdmin();
  }

  /**
   * Generate a secure random JWT secret
   * @returns {string} Secure random secret
   */
  generateSecureSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Initialize default admin user if none exist
   */
  initializeDefaultAdmin() {
    const stats = UserService.getUserStats();
    
    if (stats.total === 0) {
      const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456789';
      
      if (defaultPassword.length < 12) {
        console.warn('WARNING: Default admin password is less than 12 characters. Please set DEFAULT_ADMIN_PASSWORD in .env');
      }
      
      UserService.initializeDefaultAdmin(defaultUsername, defaultPassword);
      console.log(`Default admin user created: ${defaultUsername}`);
    }
  }
  /**
   * Check if channel selection needs admin
   * @returns {boolean}
   */
  channelSelectionRequiresAdmin() {
    return this.CHANNEL_SELECTION_REQUIRES_ADMIN;
  }

  /**
   * Authenticate user and generate JWT token
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Object|null} Object with token and user info, or null if authentication fails
   */
  login(username, password) {
    const user = UserService.authenticate(username, password);
    
    if (!user) {
      return null;
    }

    const token = this.generateToken(user);
    
    return {
      token,
      user,
    };
  }

  /**
   * Generate a JWT token for a user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        isAdmin: user.role === 'admin',
      },
      this.JWT_SECRET,
      {
        expiresIn: this.JWT_EXPIRY,
      }
    );
  }

  /**
   * Verify a JWT token
   * @param {string} token - The JWT token to verify
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is admin
   * @param {Object} user - User object from JWT
   * @returns {boolean} True if user is admin
   */
  isAdmin(user) {
    return user && user.role === 'admin';
  }
}

module.exports = new AuthService();
