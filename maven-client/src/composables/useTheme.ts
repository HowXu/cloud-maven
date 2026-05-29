import { computed, ref } from "vue";

const storageKey = "cloud-maven-theme";
const theme = ref<"light" | "dark">("light");

export function useTheme() {
  const isDark = computed(() => theme.value === "dark");

  const initializeTheme = () => {
    const stored = localStorage.getItem(storageKey);

    if (stored === "dark" || stored === "light") {
      theme.value = stored;
      return;
    }

    theme.value = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const toggleTheme = () => {
    theme.value = isDark.value ? "light" : "dark";
    localStorage.setItem(storageKey, theme.value);
  };

  return {
    theme,
    isDark,
    initializeTheme,
    toggleTheme,
  };
}
