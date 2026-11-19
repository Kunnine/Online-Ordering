import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_URL
    ? env.VITE_API_URL.replace(/\/api\/?$/, "")
    : "https://fastfood-backend-production-cec51710.up.railway.app";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": target,
        "/image": target,
      },
    },
  };
});
