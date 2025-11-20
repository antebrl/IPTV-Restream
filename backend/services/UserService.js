const User = require('../models/User');

/**
 * Service for managing users
 */
class UserService {
  /**
   * Get all users
   * @returns {Array} Array of users without passwords
   */
  getAllUsers() {
    return User.getAllUsers();
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Object|null} User without password
   */
  getUserById(id) {
    return User.getUserById(id);
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user without password
   */
  createUser(userData) {
    return User.createUser(userData);
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated user without password
   */
  updateUser(id, updates) {
    return User.updateUser(id, updates);
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {boolean} True if deleted
   */
  deleteUser(id) {
    return User.deleteUser(id);
  }

  /**
   * Authenticate user
   * @param {string} username - Username
   * @param {string} password - Plain password
   * @returns {Object|null} User without password if authenticated, null otherwise
   */
  authenticate(username, password) {
    const user = User.getUserByUsername(username);
    
    if (!user) {
      return null;
    }

    if (!User.verifyPassword(password, user.password)) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user statistics
   * @returns {Object} User counts by role
   */
  getUserStats() {
    return User.getUserCounts();
  }

  /**
   * Initialize default admin user if no users exist
   * @param {string} username - Admin username
   * @param {string} password - Admin password
   * @returns {Object|null} Created admin user or null if users already exist
   */
  initializeDefaultAdmin(username, password) {
    const stats = User.getUserCounts();
    
    if (stats.total === 0) {
      return User.createUser({
        username,
        password,
        role: 'admin',
      });
    }
    
    return null;
  }
}

module.exports = new UserService();
