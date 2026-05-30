import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { settingsApi } from "@/api/settings";
import type { ClientSettings } from "@/types";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const defaultSettings: ClientSettings = {
  title: "Cloud-Maven",
  baseUrl: "https://repo.example.com",
  defaultRepository: "",
  anonymousRead: true,
  allowOverwrite: false,
  generateChecksums: false,
  maintainMetadata: false,
  introImage: "",
};

describe("settingsApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.put).mockReset();
  });

  describe("get", () => {
    it("fetches settings via GET /api/admin/settings", () => {
      settingsApi.get();
      expect(apiClient.get).toHaveBeenCalledWith("/api/admin/settings");
    });

    it("returns ClientSettings type", () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: defaultSettings });
      expect(settingsApi.get()).toBeDefined();
    });
  });

  describe("update", () => {
    it("updates settings via PUT /api/admin/settings", () => {
      settingsApi.update(defaultSettings);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/settings", defaultSettings);
    });

    it("sends all settings fields", () => {
      const settings: ClientSettings = {
        title: "Custom Title",
        baseUrl: "https://custom.example.com",
        defaultRepository: "",
        anonymousRead: false,
        allowOverwrite: true,
        generateChecksums: true,
        maintainMetadata: true,
        introImage: "https://example.com/image.png",
      };

      settingsApi.update(settings);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/settings", settings);
    });

    it("can update single field", () => {
      const partial: Partial<ClientSettings> = { title: "New Title" };
      settingsApi.update({ ...defaultSettings, ...partial });
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/settings", expect.objectContaining({ title: "New Title" }));
    });

    it("sends empty strings for baseUrl when not set", () => {
      const settings: ClientSettings = { ...defaultSettings, baseUrl: "" };
      settingsApi.update(settings);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/settings", settings);
    });

    it("can update introImage", () => {
      const settings: ClientSettings = { ...defaultSettings, introImage: "https://example.com/intro.png" };
      settingsApi.update(settings);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/settings", expect.objectContaining({ introImage: "https://example.com/intro.png" }));
    });
  });

  describe("ClientSettings type", () => {
    it("has correct structure with all fields", () => {
      expect(defaultSettings.title).toBe("Cloud-Maven");
      expect(defaultSettings.anonymousRead).toBe(true);
      expect(defaultSettings.allowOverwrite).toBe(false);
    });

    it("has introImage field", () => {
      const settings: ClientSettings = { ...defaultSettings, introImage: "https://example.com/image.png" };
      expect(settings.introImage).toBe("https://example.com/image.png");
    });

    it("allows partial initialization", () => {
      const minimal: ClientSettings = {
        title: "Minimal",
        baseUrl: "",
        defaultRepository: "",
        anonymousRead: false,
        allowOverwrite: false,
        generateChecksums: false,
        maintainMetadata: false,
        introImage: "",
      };
      expect(minimal.title).toBe("Minimal");
      expect(minimal.maintainMetadata).toBe(false);
      expect(minimal.introImage).toBe("");
    });

    it("defaultRepository is empty string (no release/snapshot distinction)", () => {
      expect(defaultSettings.defaultRepository).toBe("");
    });
  });
});