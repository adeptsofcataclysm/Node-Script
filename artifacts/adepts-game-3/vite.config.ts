import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.PORT ?? "5173");
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT ?? ""}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

// When the UI runs on Vite but the API runs separately (typical local dev),
// proxy Socket.io + REST to the API origin so `io(..., { path: "/socket.io" })` keeps working.
const devApiTarget = process.env.VITE_DEV_API_TARGET ?? "http://127.0.0.1:3000";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/socket.io": { target: devApiTarget, ws: true, changeOrigin: true },
      "/api": { target: devApiTarget, changeOrigin: true },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/socket.io": { target: devApiTarget, ws: true, changeOrigin: true },
      "/api": { target: devApiTarget, changeOrigin: true },
    },
  },
});
