import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Keep React in a long-lived chunk: UI changes then only invalidate the
        // small app chunk instead of re-downloading ~190 kB of react-dom.
        // Everything else stays in the entry chunk (or its dynamic import), so
        // this does not defeat the on-demand hash-wasm/qrcode chunks.
        manualChunks(id) {
          if (/node_modules\/(?:react|react-dom|scheduler)\//.test(id)) return "react";
        },
      },
    },
  },
});
