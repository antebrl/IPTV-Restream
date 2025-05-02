require('dotenv').config();
const jwt = require('jsonwebtoken');

const ADMIN_ENABLED = process.env.ADMIN_ENABLED === 'true';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || 'streamhub-jwt-secret';
const JWT_EXPIRY = '24h';

module.exports = {
  adminLogin(req, res) {
    if (!ADMIN_ENABLED || ADMIN_PASSWORD === undefined) {
      return res.status(403).json({ 
        success: false,
        message: 'Admin mode is disabled on this server' 
      });
    }

    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
      // Generate JWT token
      const token = jwt.sign(
        { isAdmin: true },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      return res.json({ 
        success: true,
        token
      });
    } else {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid password' 
      });
    }
  },

  checkAdminStatus(req, res) {
    res.json({ 
      enabled: ADMIN_ENABLED 
    });
  },

  // Verify JWT token middleware
  verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
  }
};