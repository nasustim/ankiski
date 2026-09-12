import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served from GitHub Pages at https://nasustim.github.io/ankiski/
export default defineConfig({
  base: "/ankiski/",
  plugins: [react(), tailwindcss()],
  build: {
    // sql.js's wasm is ~660 kB; never inline it as a data URI.
    assetsInlineLimit: 0,
  },
  // sql.js ships a UMD bundle, so let Vite pre-bundle it for dev. Its wasm is pulled in as a
  // build asset from src/lib/apkg-runtime.ts rather than fetched by filename at runtime.
  optimizeDeps: {
    include: ["sql.js"],
  },
});
