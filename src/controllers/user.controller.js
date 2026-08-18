import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

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

export { registerUser, loginUser, logoutUser, getCurrentUser };
