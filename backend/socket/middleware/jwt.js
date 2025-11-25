const authService = require("../../services/auth/AuthService");

/**
 * Socket.io middleware to authenticate users via JWT token
 * Authentication is now REQUIRED for all socket connections
 */
function socketAuthMiddleware(socket, next) {
  // Retrieve token from handshake auth or query param
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  const decoded = authService.verifyToken(token);

  if (!decoded) {
    return next(new Error("Invalid or expired token"));
  }

  // Attach the decoded user info to the socket
  socket.user = decoded;
  return next();
}

module.exports = socketAuthMiddleware;
