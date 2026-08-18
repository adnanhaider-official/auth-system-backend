import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const verifyJwt = asyncHandler(async (req, res, next) => {
  // Get access token from cookie or Authorization header
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  // Check token
  if (!token) {
    throw new ApiError(401, "Unauthorized Token");
  }

  // Verify token
  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  // Find user from decoded token
  const user = await User.findById(decodedToken._id).select(
    "-password -refreshToken"
  );

  // Check user
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Store user in request
  // So protected controllers can access req.user
  req.user = user;

  // Move to next middleware/controller
  next();
});

export default verifyJwt;
