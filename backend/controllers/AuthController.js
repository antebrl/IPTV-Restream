require("dotenv").config();
const authService = require("../services/auth/AuthService");

module.exports = {
  /**
   * Login endpoint for all users (admin and regular users)
   */
  login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const result = authService.login(username, password);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    return res.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  },

  /**
   * Check authentication status
   */
  checkAuthStatus(req, res) {
    res.json({
      authRequired: true,
      channelSelectionRequiresAdmin: authService.channelSelectionRequiresAdmin(),
    });
  },

  /**
   * Verify JWT token middleware - REQUIRED for all routes
   */
  verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = authService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    req.user = decoded;
    next();
  },

  /**
   * Verify admin role middleware
   */
  verifyAdmin(req, res, next) {
    if (!authService.isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }
    next();
  },
};
