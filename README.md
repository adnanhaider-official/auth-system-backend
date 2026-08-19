# Auth System Backend

A secure and scalable authentication backend built with **Node.js, Express.js, MongoDB, and JWT**.
The project implements modern authentication and security practices including access/refresh tokens, OAuth, CSRF protection, rate limiting, Helmet, CORS, and Zod-based request validation.

## Features

### Authentication

- User registration
- User login
- User logout
- Protected routes using JWT
- Access token & refresh token
- Refresh access token
- Secure cookie-based token storage
- Change password
- Forgot password
- Reset password
- Email verification
- Resend verification email

### Google Authentication

- Google Login
- Google OAuth callback

### Security

- JWT authentication middleware
- HTTP-only cookies
- Secure cookie configuration
- SameSite cookie protection
- CSRF protection using `csrf-csrf`
- CORS configuration
- Helmet security headers
- Rate limiting
- Login rate limiting
- Email-action rate limiting
- Request validation using Zod
- Custom API error handling

### Request Validation

The project uses **Zod** to validate incoming API data before it reaches the controller.

Implemented schemas:

- Register validation
- Login validation
- Forgot password validation
- Reset password validation
- Change password validation

A reusable validation middleware is used:

```js
validate(schema);
```

This keeps validation logic separate from controllers and allows the same middleware to be reused with different schemas.

## 🛠️ Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose

### Authentication & Security

- JSON Web Token (JWT)
- bcrypt
- csrf-csrf
- Helmet
- CORS
- express-rate-limit
- Zod

### OAuth & Email

- Google OAuth
- Nodemailer

## 📁 Project Structure

```text
src/
├── controllers/
│   └── user.controller.js
│
├── middlewares/
│   ├── auth.middleware.js
│   ├── csrf.js
│   ├── rateLimiter.js
│   └── validate.js
│
├── models/
│   └── user.model.js
│
├── routes/
│   └── user.routes.js
│
├── utils/
│   ├── ApiError.js
│   ├── ApiResponse.js
│   └── ...
│
├── validators/
│   └── user.validator.js
│
└── app.js
```

## 🔐 Authentication Flow

### Register

```text
Client
  ↓
POST /register
  ↓
Zod Validation
  ↓
Register Controller
  ↓
Password Hashing
  ↓
MongoDB
```

### Login

```text
Client
  ↓
POST /login
  ↓
Rate Limiter
  ↓
Zod Validation
  ↓
Login Controller
  ↓
Verify Password
  ↓
Generate Access + Refresh Token
  ↓
Secure Cookies
```

### Protected Route

```text
Client
  ↓
Request + Cookie
  ↓
JWT Middleware
  ↓
Verify Access Token
  ↓
Controller
```

### Refresh Token

```text
Client
  ↓
Refresh Token
  ↓
Verify JWT
  ↓
Find User
  ↓
Generate New Access Token
```

## 🛡️ CSRF Protection

The project uses `csrf-csrf` for **Double Submit Cookie CSRF protection**.

CSRF token is generated through:

```text
GET /csrf-token
```

State-changing protected routes use CSRF protection, such as:

```text
POST /logout
POST /change-password
```

## 🧱 Rate Limiting

Different rate limits are used for sensitive operations.

### Login

```text
POST /login
```

Uses `loginLimiter` to reduce brute-force attacks.

### Email Actions

```text
POST /forget-password
POST /send-verification-email
```

Use `emailActionLimiter` to reduce email abuse and spam.

## 🛡️ Helmet

Helmet is used globally:

```js
app.use(helmet());
```

It adds security-related HTTP response headers and provides an additional layer of browser security.

## 🌐 CORS

CORS is configured to allow requests from the authorized frontend origin.

Example:

```js
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
```

This allows the frontend and backend to communicate while controlling which origin is allowed.

## ✅ Zod Validation

The project uses a reusable validation middleware:

```js
const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(
        400,
        result.error.issues.map((issue) => issue.message).join(", ")
      );
    }

    req.body = result.data;

    next();
  };
};
```

Example:

```js
router.post("/register", validate(registerSchema), registerUser);
```

## 📌 API Routes

### Authentication

| Method | Endpoint           | Purpose              |
| ------ | ------------------ | -------------------- |
| POST   | `/register`        | Register user        |
| POST   | `/login`           | Login user           |
| POST   | `/logout`          | Logout user          |
| GET    | `/profile`         | Get current user     |
| POST   | `/refresh-token`   | Refresh access token |
| POST   | `/change-password` | Change password      |

### Password Recovery

| Method | Endpoint           | Purpose                   |
| ------ | ------------------ | ------------------------- |
| POST   | `/forget-password` | Send password reset email |
| POST   | `/reset-password`  | Reset password            |

### Email Verification

| Method | Endpoint                   | Purpose                 |
| ------ | -------------------------- | ----------------------- |
| POST   | `/send-verification-email` | Send verification email |
| GET    | `/verify-email`            | Verify email            |

### Google Authentication

| Method | Endpoint           | Purpose               |
| ------ | ------------------ | --------------------- |
| GET    | `/google`          | Start Google OAuth    |
| GET    | `/google/callback` | Google OAuth callback |

### CSRF

| Method | Endpoint      | Purpose             |
| ------ | ------------- | ------------------- |
| GET    | `/csrf-token` | Generate CSRF token |

## ⚙️ Environment Variables

Create a `.env` file:

````env
PORT=5000

MONGO_URL=your_mongodb_connection_string
DB_NAME=your_database_name

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=...
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=...

CSRF_SECRET=your_csrf_secret

CLIENT_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

Never commit your `.env` file to GitHub.

## ▶️ Installation

Clone the repository and install dependencies:

```bash
npm install
````

Create your `.env` file and configure the required environment variables.

Start development server:

```bash
npm run dev
```

Start production server:

```bash
npm start
```

## 🧪 Testing

API endpoints can be tested using **Postman**.

Recommended testing order:

```text
Register
   ↓
Login
   ↓
Profile
   ↓
Refresh Token
   ↓
Change Password
   ↓
Logout
```

Password recovery:

```text
Forgot Password
   ↓
Email Reset Link
   ↓
Reset Password
```

Email verification:

```text
Register
   ↓
Verification Email
   ↓
Verify Email
```

## 🔒 Security Status

Currently implemented:

- JWT authentication
- Access/refresh token system
- Secure cookie configuration
- CSRF protection
- CORS
- Helmet
- Rate limiting
- Zod request validation
- Password hashing
- Email verification
- Password reset flow
- Google authentication

### Future Security Improvements

Potential future improvements include:

- Refresh token rotation
- Refresh token reuse detection
- Session/device management
- Multi-factor authentication (MFA)
- Audit logging
- Redis-based distributed rate limiting
- Advanced Content Security Policy configuration
- Production HTTPS hardening

## 📚 Learning Goals

This project was built to understand how a production-style authentication system works using Node.js and Express.

The main focus is:

```text
Authentication
      +
Authorization
      +
Token Management
      +
OAuth
      +
Email Verification
      +
CSRF Protection
      +
CORS
      +
Rate Limiting
      +
Security Headers
      +
Input Validation
```

## 👨‍💻 Author

**Adnan Haider**

Built as a backend authentication project to practice secure and production-oriented Node.js development.
