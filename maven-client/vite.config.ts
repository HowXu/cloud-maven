import { fileURLToPath, URL } from "node:url";
import UnoCSS from "unocss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [vue(), UnoCSS()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    emptyOutDir: true,
    outDir: "dist",
    chunkSizeWarningLimit: 768,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor": {
            pre: (id) => id.includes("node_modules") && !id.includes("lucide"),
            filter: (id) => id.includes("node_modules"),
          },
          "vue-vendor": ["vue", "vue-router"],
          "axios-vendor": ["axios"],
          "icons-vendor": ["lucide-vue-next"],
          "toast-vendor": ["mosha-vue-toastify"],
          "modal-vendor": ["vue-final-modal"],
        },
      },
    },
  },
});
