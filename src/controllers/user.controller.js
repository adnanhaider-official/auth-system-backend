import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import { OAuth2Client } from "google-auth-library";
import { generateCsrfToken } from "../middlewares/csrf.js";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

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
    .json(
      new ApiResponse(
        200,
        { user: loggedIn, refreshToken },
        "User login successfully"
      )
    );
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

  // Generate new refreshToken token
  const refreshToken = user.generateRefreshToken();

  // Add new refreshToken in db
  user.refreshToken = refreshToken;

  await user.save({
    validateBeforeSave: false,
  });

  // Cookie options
  const options = {
    httpOnly: true,
    secure: false, // localhost
  };

  // Send new access token
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, null, "Access token refreshed successfully"));
});

// Change Password
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

// Forget Password
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

// Reset Password
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

// send EmailVerification
const sendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // Token expires after 10 minutes
  const emailVerificationExpiry = Date.now() + 10 * 60 * 1000;

  // Save token and expiry
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpiry = emailVerificationExpiry;

  await user.save({
    validateBeforeSave: false,
  });

  // Create verification link
  const verifyLink = `http://localhost:5173/verify-email?token=${verificationToken}`;

  // Send verification email
  await sendEmail({
    to: user.email,
    subject: "Verify Your Email",
    html: `
            <h2>Verify Your Email</h2>

            <p>
                Please click the link below to verify your email.
            </p>

            <a href="${verifyLink}">
                Verify Email
            </a>

            <p>
                This link will expire in 10 minutes.
            </p>
        `,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Verification email sent successfully"));
});

// verify Email
const verifyEmail = asyncHandler(async (req, res) => {
  // Get verification token from URL
  const { token } = req.query;

  // Check token
  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  // Find user using token and check token expiry
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: {
      $gt: Date.now(),
    },
  });

  // Check token
  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  // Verify email
  user.isEmailVerified = true;

  // Remove verification token
  user.emailVerificationToken = null;
  user.emailVerificationExpiry = null;

  // Save changes
  await user.save();

  // Response
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Email verified successfully"));
});

// google login
const googleLogin = asyncHandler(async (req, res) => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "profile", "email"],
    prompt: "consent",
  });

  return res.redirect(authUrl);
});

// google Callback url
const googleCallback = asyncHandler(async (req, res) => {
  // Get authorization code from Google
  const { code } = req.query;

  if (!code) {
    throw new ApiError(400, "Google authorization code is missing");
  }

  // Exchange code for Google tokens
  const { tokens } = await googleClient.getToken({
    code,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
  });

  // Get Google ID token
  const { id_token } = tokens;

  // Verify Google ID token
  const ticket = await googleClient.verifyIdToken({
    idToken: id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  // Get Google user information
  const payload = ticket.getPayload();

  const { sub, email, name, email_verified } = payload;

  // Find existing user
  const existingUser = await User.findOne({
    email,
  });

  let user = existingUser;

  // Create user if not found
  if (!user) {
    user = await User.create({
      fullname: name,
      email,
      username: email.split("@")[0],
      googleId: sub,
      authProvider: "google",
      isEmailVerified: email_verified,
    });
  }

  // Generate application tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  user.refreshToken = refreshToken;

  await user.save({
    validateBeforeSave: false,
  });

  // Cookie options
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  // Send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, user, "Google login successful"));
});

// Manual CSRF
// const getCsrfToken = (req, res) => {
//   const csrfToken = crypto.randomBytes(32).toString("hex");

//   const options = {
//     httpOnly: false,
//     secure: false, // localhost
//     sameSite: "strict",
//   };

//   return res
//     .status(200)
//     .cookie("csrfToken", csrfToken, options)
//     .json(new ApiResponse(200, csrfToken, "CSRF Token generate Successfully"));
// };

const getCsrfToken = asyncHandler((req, res) => {
  const csrfToken = generateCsrfToken(req, res);

  return res
    .status(200)
    .json(new ApiResponse(200, csrfToken, "CSRF Token generated successfully"));
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
  sendVerificationEmail,
  verifyEmail,
  googleLogin,
  googleCallback,
  getCsrfToken,
};
