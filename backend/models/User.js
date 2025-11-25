const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, '../data/users.json');

/**
 * User model for managing application users
 */
class User {
  constructor() {
    this.ensureDataDirectory();
    this.users = this.loadUsers();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    return [];
  }

  saveUsers() {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving users:', error);
      return false;
    }
  }

  /**
   * Get all users (without passwords)
   * @returns {Array} Array of users without password field
   */
  getAllUsers() {
    return this.users.map(({ password, ...user }) => user);
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Object|null} User object without password
   */
  getUserById(id) {
    const user = this.users.find(u => u.id === id);
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user by username (includes password for authentication)
   * @param {string} username - Username
   * @returns {Object|null} User object with password
   */
  getUserByUsername(username) {
    return this.users.find(u => u.username === username);
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.username - Username
   * @param {string} userData.password - Plain password (will be hashed)
   * @param {string} userData.role - User role (admin or user)
   * @returns {Object|null} Created user without password or null if failed
   */
  createUser({ username, password, role = 'user' }) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    if (this.getUserByUsername(username)) {
      throw new Error('Username already exists');
    }

    if (!['admin', 'user'].includes(role)) {
      throw new Error('Invalid role. Must be "admin" or "user"');
    }

    const newUser = {
      id: crypto.randomUUID(),
      username,
      password: this.hashPassword(password),
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.saveUsers();

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated user without password or null if not found
   */
  updateUser(id, updates) {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      return null;
    }

    // Don't allow changing ID or createdAt
    const { id: _, createdAt, password, ...validUpdates } = updates;

    // If password is being updated, hash it
    if (password) {
      validUpdates.password = this.hashPassword(password);
    }

    // Validate role if being updated
    if (validUpdates.role && !['admin', 'user'].includes(validUpdates.role)) {
      throw new Error('Invalid role. Must be "admin" or "user"');
    }

    // Check if username is being changed and if it's already taken
    if (validUpdates.username && validUpdates.username !== this.users[index].username) {
      if (this.getUserByUsername(validUpdates.username)) {
        throw new Error('Username already exists');
      }
    }

    this.users[index] = {
      ...this.users[index],
      ...validUpdates,
      updatedAt: new Date().toISOString(),
    };

    this.saveUsers();

    const { password: __, ...userWithoutPassword } = this.users[index];
    return userWithoutPassword;
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {boolean} True if deleted, false if not found
   */
  deleteUser(id) {
    const initialLength = this.users.length;
    this.users = this.users.filter(u => u.id !== id);
    
    if (this.users.length < initialLength) {
      this.saveUsers();
      return true;
    }
    
    return false;
  }

  /**
   * Verify password
   * @param {string} plainPassword - Plain password
   * @param {string} hashedPassword - Hashed password
   * @returns {boolean} True if password matches
   */
  verifyPassword(plainPassword, hashedPassword) {
    return this.hashPassword(plainPassword) === hashedPassword;
  }

  /**
   * Hash password using SHA-256
   * @param {string} password - Plain password
   * @returns {string} Hashed password
   */
  hashPassword(password) {
    return crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');
  }

  /**
   * Count users by role
   * @returns {Object} Object with admin and user counts
   */
  getUserCounts() {
    return {
      total: this.users.length,
      admins: this.users.filter(u => u.role === 'admin').length,
      users: this.users.filter(u => u.role === 'user').length,
    };
  }
}

module.exports = new User();
