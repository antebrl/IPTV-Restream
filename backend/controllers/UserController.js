const UserService = require("../services/UserService");

module.exports = {
  /**
   * Get all users (admin only)
   */
  getAllUsers(req, res) {
    try {
      const users = UserService.getAllUsers();
      res.json({ success: true, users });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve users",
        error: error.message,
      });
    }
  },

  /**
   * Get user by ID
   */
  getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = UserService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user",
        error: error.message,
      });
    }
  },

  /**
   * Create a new user (admin only)
   */
  createUser(req, res) {
    try {
      const { username, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Username and password are required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      const user = UserService.createUser({ username, password, role });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create user",
      });
    }
  },

  /**
   * Update user (admin only, or user updating their own password)
   */
  updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const requestingUser = req.user;

      // Users can only update their own password, admins can update everything
      if (requestingUser.role !== 'admin' && requestingUser.id !== id) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own account",
        });
      }

      // Non-admins can only update password
      if (requestingUser.role !== 'admin') {
        const allowedFields = ['password'];
        const requestedFields = Object.keys(updates);
        const invalidFields = requestedFields.filter(f => !allowedFields.includes(f));
        
        if (invalidFields.length > 0) {
          return res.status(403).json({
            success: false,
            message: "You can only update your own password",
          });
        }
      }

      if (updates.password && updates.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      const user = UserService.updateUser(id, updates);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "User updated successfully",
        user,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update user",
      });
    }
  },

  /**
   * Delete user (admin only)
   */
  deleteUser(req, res) {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      // Prevent admin from deleting themselves
      if (requestingUser.id === id) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account",
        });
      }

      const deleted = UserService.deleteUser(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
        error: error.message,
      });
    }
  },

  /**
   * Get user statistics (admin only)
   */
  getUserStats(req, res) {
    try {
      const stats = UserService.getUserStats();
      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve statistics",
        error: error.message,
      });
    }
  },

  /**
   * Get current user info
   */
  getCurrentUser(req, res) {
    try {
      const user = UserService.getUserById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user information",
        error: error.message,
      });
    }
  },
};
