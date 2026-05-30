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
    historyApiFallback: {
      rewrites: [
        { from: /^(?!\/api($|\/)).*$/, to: "/index.html" },
      ],
    },
  },
  build: {
    emptyOutDir: true,
    outDir: "dist",
    chunkSizeWarningLimit: 768,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules") && !id.includes("lucide")) {
            return "vendor";
          }
          if (id.includes("node_modules/lucide")) {
            return "icons-vendor";
          }
          if (id.includes("node_modules/mosha-vue-toastify")) {
            return "toast-vendor";
          }
          if (id.includes("node_modules/vue-final-modal")) {
            return "modal-vendor";
          }
          if (id.includes("vue") || id.includes("vue-router")) {
            return "vue-vendor";
          }
          if (id.includes("axios")) {
            return "axios-vendor";
          }
        },
      },
    },
  },
});
