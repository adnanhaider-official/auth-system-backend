import ApiError from "../utils/ApiError.js";

const verifyCsrfToken = (req, res, next) => {
  const cookieToken = req.cookies?.csrfToken;

  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken) {
    throw new ApiError(400, "Csrf Token is missing..");
  }

  if (cookieToken !== headerToken) {
    throw new ApiError(403, "Invalid CSRF token");
  }

  next();
};

export { verifyCsrfToken };
