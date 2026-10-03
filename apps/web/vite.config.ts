import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:4000",
      "/socket.io": {
        target: "ws://localhost:4000",
        ws: true
      }
    }
  },
  worker: {
    format: "es"
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"]
  }
});
