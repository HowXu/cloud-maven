import { computed, ref } from "vue";

const storageKey = "cloud-maven-theme";
const theme = ref<"light" | "dark">("light");
const HIGHLIGHT_DARK_HREF = "https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github-dark.min.css";

let darkHljsLink: HTMLLinkElement | null = null;

const syncDocumentClass = () => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme.value === "dark");
};

const syncHljsTheme = () => {
  if (typeof document === "undefined") return;
  if (theme.value === "dark") {
    if (!darkHljsLink) {
      darkHljsLink = document.createElement("link");
      darkHljsLink.rel = "stylesheet";
      darkHljsLink.href = HIGHLIGHT_DARK_HREF;
      document.head.appendChild(darkHljsLink);
    }
  } else {
    if (darkHljsLink) {
      darkHljsLink.remove();
      darkHljsLink = null;
    }
  }
};

export function useTheme() {
  const isDark = computed(() => theme.value === "dark");

  const initializeTheme = () => {
    const stored = localStorage.getItem(storageKey);

    if (stored === "dark" || stored === "light") {
      theme.value = stored;
    } else {
      theme.value = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    syncDocumentClass();
    syncHljsTheme();
  };

  const toggleTheme = () => {
    theme.value = isDark.value ? "light" : "dark";
    localStorage.setItem(storageKey, theme.value);
    syncDocumentClass();
    syncHljsTheme();
  };

  return {
    theme,
    isDark,
    initializeTheme,
    toggleTheme,
  };
}
