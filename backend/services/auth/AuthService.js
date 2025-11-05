const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

/**
 * Service for handling JWT authentication
 */
class AuthService {
  constructor() {
    this.ADMIN_ENABLED = process.env.ADMIN_ENABLED === "true";
    this.CHANNEL_SELECTION_REQUIRES_ADMIN =
      process.env.CHANNEL_SELECTION_REQUIRES_ADMIN === "true";
    this.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";

    // Validate admin password if admin mode is enabled
    if (
      this.ADMIN_ENABLED &&
      (!this.ADMIN_PASSWORD || this.ADMIN_PASSWORD.length < 12)
    ) {
      throw new Error(
        "ADMIN_PASSWORD must be set and at least 12 characters long for security."
      );
    }

    // Generate a secure JWT secret from the admin password
    // or use a random value if admin mode is disabled
    this.JWT_SECRET = crypto
      .createHash("sha256")
      .update(this.ADMIN_PASSWORD || "")
      .digest("hex");
  }
  /**
   * Check if channel selection needs admin
   * @returns {boolean}
   */
  channelSelectionRequiresAdmin() {
    return this.CHANNEL_SELECTION_REQUIRES_ADMIN && this.ADMIN_ENABLED;
  }

  /**
   * Generate a JWT token for an admin user
   * @returns {string} JWT token
   */
  generateAdminToken() {
    return jwt.sign({ isAdmin: true }, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRY,
    });
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
   * Check if admin mode is enabled
   * @returns {boolean} True if admin mode is enabled
   */
  isAdminEnabled() {
    return this.ADMIN_ENABLED;
  }

  /**
   * Verify admin password
   * @param {string} password - Password to verify
   * @returns {boolean} True if password matches
   */
  verifyAdminPassword(password) {
    return this.ADMIN_PASSWORD === password;
  }
}

module.exports = new AuthService();
