import {
  defineConfig,
  presetAttributify,
  presetUno,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
  dark: "class",
  presets: [presetUno(), presetAttributify()],
  transformers: [transformerVariantGroup()],
  theme: {
    fontFamily: {
      sans: "'Open Sans', Inter, ui-sans-serif, system-ui, sans-serif",
      mono: "Consolas, Monaco, ui-monospace, SFMono-Regular, monospace",
    },
    colors: {
      cloud: {
        ink: "#111827",
        muted: "#6b7280",
        line: "#e5e7eb",
        panel: "#ffffff",
        wash: "#f4f5f7",
        blue: "#2563eb",
        teal: "#0f766e",
        amber: "#d97706",
      },
    },
  },
  shortcuts: {
    "page-shell": "min-h-screen bg-cloud-wash text-cloud-ink dark:bg-black dark:text-white",
    "content-container": "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10",
    "panel-surface": "border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900",
    "soft-button": "inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors duration-300 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
    "icon-button": "inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors duration-300 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
    "field-control": "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors duration-300 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white",
    "muted-label": "text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400",
    "hover-lift": "transition-transform duration-200 ease hover:-translate-y-0.5 hover:shadow-md",
  },
});
