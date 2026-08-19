import { doubleCsrf } from "csrf-csrf";

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,

  getSessionIdentifier: (req) => req.cookies?.accessToken || "anonymous",

  cookieName: "csrfToken",

  cookieOptions: {
    httpOnly: false,
    secure: false,
    sameSite: "strict",
  },

  size: 64,

  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

export { generateCsrfToken, doubleCsrfProtection };

// Manual Csrf Middleware

// import ApiError from "../utils/ApiError.js";

// const verifyCsrfToken = (req, res, next) => {
//   const cookieToken = req.cookies?.csrfToken;

//   const headerToken = req.headers["x-csrf-token"];

//   if (!cookieToken || !headerToken) {
//     throw new ApiError(400, "Csrf Token is missing..");
//   }

//   if (cookieToken !== headerToken) {
//     throw new ApiError(403, "Invalid CSRF token");
//   }

//   next();
// };

// export { verifyCsrfToken };
