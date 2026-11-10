const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { ROLES, USER_STATUS } = require('../config/constants');

/**
 * Validates JWT Bearer Token and injects req.user
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied: No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, full_name, role, status }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * RBAC Guard
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized: User context missing' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] permissions, current role is '${req.user.role}'`
      });
    }

    next();
  };
}

/**
 * Author Action Guard: Ensures user is either superadmin OR an APPROVED author
 */
function requireApprovedAuthorOrSuperAdmin(req, res, next) {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ error: 'Unauthorized: User context missing' });
  }

  if (req.user.role === ROLES.SUPERADMIN) {
    return next();
  }

  if (req.user.role === ROLES.AUTHOR) {
    if (req.user.status !== USER_STATUS.APPROVED) {
      return res.status(403).json({
        error: 'Forbidden: Your Author account is currently awaiting Super Admin approval. You cannot publish or edit books yet.'
      });
    }
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden: Only verified Authors and Super Admins can perform book management tasks.'
  });
}

module.exports = {
  authenticateToken,
  requireRole,
  requireApprovedAuthorOrSuperAdmin
};
