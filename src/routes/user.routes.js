import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  googleLogin,
  googleCallback,
  getCsrfToken,
} from "../controllers/user.controller.js";

import verifyJwt from "../middlewares/auth.middleware.js";

import { loginLimiter } from "../middlewares/rateLimiter.js";

import { emailActionLimiter } from "../middlewares/rateLimiter.js";

// Manual Csrf Token Middlware
// import { verifyCsrfToken } from "../middlewares/csrf.js";

import { doubleCsrfProtection } from "../middlewares/csrf.js";

const router = Router();

router.post("/register", registerUser);

router.post("/login", loginLimiter, loginUser);

router.post("/logout", verifyJwt, doubleCsrfProtection, logoutUser);

// Manual Csrf Routes
// router.post("/logout", verifyJwt, verifyCsrfToken, logoutUser);

router.get("/profile", verifyJwt, getCurrentUser);

router.post("/refresh-token", refreshAccessToken);

router.post(
  "/change-password",
  verifyJwt,
  doubleCsrfProtection,
  changePassword
);

// Manual Csrf Routes
// router.post("/change-password", verifyJwt, verifyCsrfToken, changePassword);

router.post("/forget-password", emailActionLimiter, forgotPassword);

router.post("/reset-password", resetPassword);

router.post(
  "/send-verification-email",
  emailActionLimiter,
  sendVerificationEmail
);

router.get("/verify-email", verifyEmail);

router.get("/google", googleLogin);

router.get("/google/callback", googleCallback);

router.get("/csrf-token", getCsrfToken);

export default router;
