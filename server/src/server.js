import net from "node:net";
import app from "./app.js";
import pool from "./config/db.js";

const DEFAULT_PORT = Number(process.env.PORT || 5000);

const findAvailablePort = async (startPort, maxChecks = 25) => {
  for (let port = startPort; port < startPort + maxChecks; port += 1) {
    const available = await new Promise((resolve) => {
      const tester = net.createServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, "127.0.0.1");
    });

    if (available) return port;
  }

  return null;
};

const startServer = async (port = DEFAULT_PORT) => {
  const server = app.listen(port, () => {
    console.log(`Leave management API listening on http://localhost:${port}`);
  });

  server.on("error", async (error) => {
    if (
      error.code === "EADDRINUSE" &&
      (process.env.AUTO_PORT === "true" || !process.env.PORT)
    ) {
      const fallbackPort = await findAvailablePort(port + 1);
      if (fallbackPort) {
        console.warn(
          `Port ${port} is already in use. Falling back to http://localhost:${fallbackPort}.`
        );
        process.env.PORT = String(fallbackPort);
        process.env.AUTO_PORT = "true";
        server.close(() => startServer(fallbackPort));
        return;
      }
    }

    console.error("Failed to start the API server:", error);
    process.exit(1);
  });

  return server;
};

const server = await startServer();

const shutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default server;