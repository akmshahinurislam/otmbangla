import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`🛑 Global Rate Limit Exceeded by IP: ${req.ip} on URL: ${req.originalUrl}`);
    res.status(429).json(options.message);
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`🛑 Auth Rate Limit Exceeded by IP: ${req.ip} attempting ${req.originalUrl}`);
    res.status(429).json(options.message);
  },
});
