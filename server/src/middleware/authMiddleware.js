import jwt from "jsonwebtoken";
import { AppError } from "../utils/errors.js";
import { getUserById } from "../services/authService.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) throw new AppError("Authentication required", 401);

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(decoded.id, decoded.role);
    if (!user) throw new AppError("User no longer exists", 401);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new AppError("Invalid or expired token", 401));
    }
    next(err);
  }
};