import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

// Prefer an explicit secret. Otherwise derive a stable value from the
// database URL so tokens stay valid across serverless instances without
// committing a secret to the repository.
const deriveSecret = () => {
  if (process.env.DATABASE_URL) {
    return crypto
      .createHash("sha256")
      .update(process.env.DATABASE_URL)
      .digest("hex");
  }
  return "dev-secret";
};

export const JWT_SECRET = process.env.JWT_SECRET || deriveSecret();
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
