import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Use 127.0.0.1 so it matches browsers opened as http://127.0.0.1:5173 (avoids localhost → ::1 vs 127.0.0.1 quirks)
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
    },
  },
});
