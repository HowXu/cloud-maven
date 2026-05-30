import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTheme } from "@/composables/useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    });
    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  describe("initial state", () => {
    it("defaults to light theme", () => {
      const { theme } = useTheme();
      expect(theme.value).toBe("light");
    });

    it("isDark returns false for light theme", () => {
      const { isDark } = useTheme();
      expect(isDark.value).toBe(false);
    });

    it("isDark returns true for dark theme", () => {
      const { theme, isDark } = useTheme();
      theme.value = "dark";
      expect(isDark.value).toBe(true);
    });
  });

  describe("initializeTheme", () => {
    it("loads stored theme from localStorage", () => {
      localStorage.setItem("cloud-maven-theme", "dark");
      const { theme } = useTheme();
      theme.value = "light";

      const { initializeTheme } = useTheme();
      initializeTheme();

      expect(theme.value).toBe("dark");
    });

    it("uses stored light theme", () => {
      localStorage.setItem("cloud-maven-theme", "light");
      const { theme } = useTheme();

      const { initializeTheme } = useTheme();
      initializeTheme();

      expect(theme.value).toBe("light");
    });

    it("detects system preference when no stored theme", () => {
      vi.stubGlobal("window", {
        matchMedia: vi.fn().mockReturnValue({ matches: true }),
      });
      const { theme } = useTheme();
      theme.value = "light";

      const { initializeTheme } = useTheme();
      initializeTheme();

      expect(theme.value).toBe("dark");
    });

    it("defaults to light when system preference cannot be determined", () => {
      vi.stubGlobal("window", {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      });
      const { theme } = useTheme();

      const { initializeTheme } = useTheme();
      initializeTheme();

      expect(theme.value).toBe("light");
    });

    it("ignores invalid stored values", () => {
      localStorage.setItem("cloud-maven-theme", "invalid");
      const { theme } = useTheme();

      const { initializeTheme } = useTheme();
      initializeTheme();

      expect(theme.value).toBe("light");
    });
  });

  describe("toggleTheme", () => {
    it("toggles from light to dark", () => {
      const { theme, toggleTheme } = useTheme();
      theme.value = "light";

      toggleTheme();

      expect(theme.value).toBe("dark");
      expect(localStorage.getItem("cloud-maven-theme")).toBe("dark");
    });

    it("toggles from dark to light", () => {
      const { theme, toggleTheme } = useTheme();
      theme.value = "dark";

      toggleTheme();

      expect(theme.value).toBe("light");
      expect(localStorage.getItem("cloud-maven-theme")).toBe("light");
    });

    it("persists theme to localStorage", () => {
      const { toggleTheme } = useTheme();

      toggleTheme();

      expect(localStorage.getItem("cloud-maven-theme")).toBe("dark");
    });
  });

  describe("isDark computed", () => {
    it("returns true when theme is dark", () => {
      const { isDark, theme } = useTheme();
      theme.value = "dark";
      expect(isDark.value).toBe(true);
    });

    it("returns false when theme is light", () => {
      const { isDark, theme } = useTheme();
      theme.value = "light";
      expect(isDark.value).toBe(false);
    });
  });
});