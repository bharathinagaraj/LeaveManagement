import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import { login } from "./controllers/authController.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import managerRoutes from "./routes/managerRoutes.js";
import pool from "./config/db.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import {
  notFoundHandler,
  errorHandler,
} from "./middleware/errorMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());

// Simple request logger for development
if (process.env.NODE_ENV !== "test") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });
}

app.get("/", (req, res) => {
  res.status(200).json({
    name: "Leave Management API",
    status: "ok",
    docs: "/api/health",
  });
});

app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", database: "connected" });
  })
);

app.use("/api/auth", authRoutes);
app.post("/auth/login", login);
app.use("/api/leaves", leaveRoutes);
app.use("/api/manager", managerRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;