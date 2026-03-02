const { validationResult } = require('express-validator');

/**
 * Middleware to check express-validator results.
 * Place after validation chains in route handlers.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Données invalides',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return next();
};

module.exports = { validate };
