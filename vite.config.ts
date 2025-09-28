/// <reference types="node" />

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isDev = mode === "development";
  const baseConfig = {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true
    },
    resolve: {
      alias: {
        "@renderer": path.resolve(__dirname, "src/renderer"),
        "@shared": path.resolve(__dirname, "src/shared")
      }
    },
    build: {
      outDir: "dist/renderer",
      sourcemap: isDev,
      emptyOutDir: false
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __DEV_SERVER_URL__: JSON.stringify(env.VITE_DEV_SERVER_URL || "")
    }
  } as const;

  return baseConfig;
});
