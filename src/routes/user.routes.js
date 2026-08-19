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
} from "../controllers/user.controller.js";

import verifyJwt from "../middlewares/auth.middleware.js";

import { loginLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.post("/register", registerUser);

router.post("/login", loginLimiter, loginUser);

router.post("/logout", verifyJwt, logoutUser);

router.get("/profile", verifyJwt, getCurrentUser);

router.post("/refresh-token", refreshAccessToken);

router.post("/change-password", verifyJwt, changePassword);

router.post("/forget-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.post("/send-verification-email", sendVerificationEmail);

router.get("/verify-email", verifyEmail);

router.get("/google", googleLogin);

router.get("/google/callback", googleCallback);

export default router;
