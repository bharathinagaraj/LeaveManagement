import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { env } from "node:process";
import { fileURLToPath } from "node:url";

const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:5000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});