import { AppError } from "../utils/errors.js";

const getDatabaseErrorMessage = (err) => {
  switch (err.code) {
    case "ECONNREFUSED":
    case "ECONNRESET":
      return "Cannot connect to PostgreSQL. Start the PostgreSQL service, then restart the API.";
    case "3D000":
      return 'The PostgreSQL database does not exist. Create the "leav" database, then run npm run db:setup and npm run db:seed.';
    case "42P01":
      return "The database schema is missing. Run npm run db:setup and npm run db:seed from the project folder.";
    case "28P01":
    case "28000":
      return "PostgreSQL rejected the configured credentials. Check DATABASE_URL in server/.env.";
    default:
      return null;
  }
};

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message =
    getDatabaseErrorMessage(err) ||
    (err.isOperational ? err.message : "Internal server error");

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ error: message });
};