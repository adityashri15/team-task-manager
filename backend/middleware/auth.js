const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
  }
};

// Check if user is Admin in a project
exports.isProjectAdmin = (project) => {
  return (req, res, next) => {
    const member = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );
    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  };
};
