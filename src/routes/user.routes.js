import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";

import verifyJwt from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJwt, logoutUser);
router.get("/profile", verifyJwt, getCurrentUser);

export default router;
