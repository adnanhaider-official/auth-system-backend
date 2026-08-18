import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
// Register User
const registerUser = asyncHandler(async (req, res) => {
  // Get user data
  const { fullname, username, email, password } = req.body;

  // Check validation
  if (
    [fullname, username, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All Fields are Required");
  }

  // Check existing user
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "Username or email already exists");
  }

  // Create user
  const user = await User.create({
    fullname,
    username,
    email,
    password,
  });

  // Get created user without sensitive fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  // get user data
  const { username, email, password } = req.body;

  //   validation
  if (!(username || email) || !password) {
    throw new ApiError(400, "All Fields are required");
  }

  //   Find User
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(404, "User with username or email not found");
  }

  //   Match password
  const isPasswordMatched = await user.isPasswordCorrect(password);

  if (!isPasswordMatched) {
    throw new ApiError(401, "Invalid credentials");
  }

  //   Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  //   Refesh Token save in db
  user.refreshToken = refreshToken;
  await user.save({
    validateBeforeSave: false,
  });

  // Get logged-in user without sensitive information
  const loggedIn = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!loggedIn) {
    throw new ApiError(400, "User not loggegIn");
  }
  // Cookie options
  const options = {
    httpOnly: true,
    secure: true,
  };

  //   send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedIn, "User login successfully"));
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  // Remove refresh token from database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  // Cookie options
  const options = {
    httpOnly: true,
    secure: false, // localhost
  };

  // Clear authentication cookies
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "", "User logout successfully"));
});

// get Current User
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Fetch Successfully"));
});

// refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Get refresh token from cookie
  const token = req.cookies?.refreshToken || req.body.refreshToken;

  // Check refresh token
  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }

  // Verify refresh token
  const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

  // Find user using token ke andar wali _id
  const user = await User.findById(decodedToken._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check whether refresh token database
  // wale refresh token ke saath match karta hai
  if (token !== user.refreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  // Generate new access token
  const accessToken = user.generateAccessToken();

  // Cookie options
  const options = {
    httpOnly: true,
    secure: false, // localhost
  };

  // Send new access token
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, null, "Access token refreshed successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
  // Get passwords from request body
  const { oldPassword, newPassword, confirmNewPassword } = req.body;

  // Check required fields
  if (!oldPassword || !newPassword || !confirmNewPassword) {
    throw new ApiError(400, "All password fields are required");
  }

  // Check new password confirmation
  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, "New and confirm password do not match");
  }

  // Find current logged-in user
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check old password
  const isPasswordMatched = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordMatched) {
    throw new ApiError(400, "Old password is incorrect");
  }

  // Set new password
  user.password = newPassword;

  // Save user
  // pre("save") automatically hashes the new password
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  // Get email from request body
  const { email } = req.body;

  // Check email
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Save reset token and expiry in database
  user.passwordResetToken = resetToken;
  user.passwordResetExpiry = Date.now() + 10 * 60 * 1000;

  await user.save();

  // Create reset password link
  const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

  // Send reset password email
  await sendEmail({
    to: user.email,
    subject: "Reset Password",
    html: `
            <h2>Reset Your Password</h2>

            <p>
                Click the button below to reset your password.
                This link will expire in 10 minutes.
            </p>

            <a href="${resetLink}">
                Reset Password
            </a>
        `,
  });

  // Send success response
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset link sent to your email"));
});

const resetPassword = asyncHandler(async (req, res) => {
  // Get reset token from query parameter
  const { token } = req.query;

  // Get new passwords from request body
  const { newPassword, confirmNewPassword } = req.body;

  // Check passwords
  if (!newPassword || !confirmNewPassword) {
    throw new ApiError(400, "New password and confirm password are required");
  }

  // Check password confirmation
  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, "New and confirm password do not match");
  }

  // Find user using reset token
  // and check that token has not expired
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpiry: {
      $gt: Date.now(),
    },
  });

  // Check token
  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  // Set new password
  user.password = newPassword;

  // Remove reset token so it cannot be reused
  user.passwordResetToken = null;
  user.passwordResetExpiry = null;

  // Save user
  // pre("save") will hash the new password
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  resetPassword,
};
