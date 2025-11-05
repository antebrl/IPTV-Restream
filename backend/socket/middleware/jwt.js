const authService = require("../../services/auth/AuthService");

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

  const decoded = authService.verifyToken(token);

  // Attach the decoded user info (or default non-admin) to the socket
  socket.user = decoded || { isAdmin: false };
  return next();
}

module.exports = socketAuthMiddleware;
