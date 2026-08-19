import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import userRoutes from "./routes/user.routes.js";
import errorHandler from "./middlewares/ErrorHandler.js";

const app = express();

// Middleware
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/api/users", userRoutes);

// Error Middleware
app.use(errorHandler);

export { app };
