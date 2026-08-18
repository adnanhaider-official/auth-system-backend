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
} from "../controllers/user.controller.js";

import verifyJwt from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJwt, logoutUser);
router.get("/profile", verifyJwt, getCurrentUser);

router.post("/refresh-token", refreshAccessToken);

router.post("/change-password", verifyJwt, changePassword);

router.post("/forget-password", forgotPassword);

router.post("/reset-password", resetPassword);

export default router;
