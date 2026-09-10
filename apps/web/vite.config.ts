import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served from GitHub Pages at https://nasustim.github.io/ankiski/
export default defineConfig({
  base: "/ankiski/",
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ["sql.js"],
  },
});
