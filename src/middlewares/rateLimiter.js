import rateLimit from "express-rate-limit";

// For Login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes

  max: 5, // 5 requests

  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// For Email Verification and ForgortPassword
export const emailActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
