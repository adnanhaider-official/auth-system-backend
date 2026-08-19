import rateLimit from "express-rate-limit";

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
