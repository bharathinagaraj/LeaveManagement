import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const serverDirectory = path.join(root, "server");
const clientDirectory = path.join(root, "client");
const runningProcesses = [];
let stopping = false;

async function findAvailablePort(startPort = 5000, maxChecks = 25) {
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
}

function runStep(command, args, cwd, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
      }
    });
  });
}

async function prepareDatabase() {
  if (process.platform === "win32") {
    await runStep(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(__dirname, "ensure-postgres.ps1"),
      ],
      root
    );
  }

  await runStep(process.execPath, ["scripts/setupDb.js"], serverDirectory);
  await runStep(process.execPath, ["scripts/seedDb.js"], serverDirectory);
}

function stopProcesses(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;

  const activeProcesses = runningProcesses.filter(
    (child) => child.pid && child.exitCode === null
  );
  if (activeProcesses.length === 0) return;

  let remaining = activeProcesses.length;
  let timeout;
  const finish = () => {
    remaining -= 1;
    if (remaining === 0) clearTimeout(timeout);
  };

  for (const child of activeProcesses) {
    child.once("close", finish);
    child.kill("SIGINT");
  }

  timeout = setTimeout(() => {
    for (const child of activeProcesses) {
      if (child.exitCode === null) child.kill("SIGTERM");
    }
  }, 5000);
  timeout.unref();
}

async function startDevelopmentServers() {
  await prepareDatabase();
  if (stopping) return;

  const apiPort = (await findAvailablePort(5000, 25)) ?? 5000;
  const apiUrl = `http://localhost:${apiPort}`;
  const serverEnv = {
    ...process.env,
    PORT: String(apiPort),
    AUTO_PORT: "true",
    VITE_PROXY_TARGET: apiUrl,
  };
  const clientEnv = {
    ...process.env,
    VITE_API_URL: `${apiUrl}/api`,
    VITE_PROXY_TARGET: apiUrl,
  };

  const server = spawn(process.execPath, ["--watch", "src/server.js"], {
    cwd: serverDirectory,
    stdio: "inherit",
    env: serverEnv,
  });
  const client = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    cwd: clientDirectory,
    stdio: "inherit",
    env: clientEnv,
  });
  runningProcesses.push(server, client);

  for (const child of runningProcesses) {
    child.once("error", (error) => {
      console.error("Failed to start a development server:", error.message);
      stopProcesses(1);
    });
    child.once("exit", (code) => {
      if (!stopping) stopProcesses(code ?? 1);
    });
  }
}

process.once("SIGINT", () => stopProcesses(0));
process.once("SIGTERM", () => stopProcesses(0));

startDevelopmentServers().catch((error) => {
  console.error("Development startup failed:", error.message);
  stopProcesses(1);
});
