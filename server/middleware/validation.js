import { validateBinData, validateRouteData, validateUserReportData } from '../firebase.config.js';

/**
 * Middleware to validate bin data
 */
export const validateBin = (req, res, next) => {
  const validation = validateBinData(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid bin data',
      details: validation.errors,
      timestamp: new Date().toISOString()
    });
  }
  
  req.validatedData = validation.data;
  next();
};

/**
 * Middleware to validate route data
 */
export const validateRoute = (req, res, next) => {
  const validation = validateRouteData(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid route data',
      details: validation.errors,
      timestamp: new Date().toISOString()
    });
  }
  
  req.validatedData = validation.data;
  next();
};

/**
 * Middleware to validate user report data
 */
export const validateUserReport = (req, res, next) => {
  const validation = validateUserReportData(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid user report data',
      details: validation.errors,
      timestamp: new Date().toISOString()
    });
  }
  
  req.validatedData = validation.data;
  next();
};

/**
 * Generic validation middleware factory
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    req.validatedData = result.data;
    next();
  };
};
