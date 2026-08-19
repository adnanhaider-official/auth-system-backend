import ApiError from "../utils/ApiError.js";

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

export { validate };
