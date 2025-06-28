const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'streamhub-jwt-secret';

/**
 * Socket.io middleware to authenticate users via JWT token
 */
function socketAuthMiddleware(socket, next) {
  // Retrieve token from handshake auth or query param
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    // Allow connection but without admin privileges
    socket.user = { isAdmin: false };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach the decoded user info to the socket for use in handlers
    socket.user = decoded;
    
    return next();
  } catch (error) {
    // If token is invalid, connect without admin privileges
    socket.user = { isAdmin: false };
    return next();
  }
}

module.exports = socketAuthMiddleware;