import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { settingsApi, settingsAdminApi } from "@/api/settings";
import type { ClientSettings } from "@/types";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const defaultSettings: ClientSettings = {
  title: "Cloud Maven",
  baseUrl: "https://repo.example.com",
  defaultRepository: "",
  anonymousRead: true,
  allowOverwrite: false,
  generateChecksums: false,
  maintainMetadata: false,
  allowedCorsOrigins: [],
  maxChecksumUploadSize: 0,
};

describe("settingsApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.put).mockReset();
  });

  describe("get", () => {
    it("fetches settings via GET /api/settings", () => {
      settingsApi.get();
      expect(apiClient.get).toHaveBeenCalledWith("/api/settings");
    });

    it("returns ClientSettings type", () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: defaultSettings });
      expect(settingsApi.get()).toBeDefined();
    });
  });

describe("settingsAdminApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.put).mockReset();
  });

  describe("get", () => {
    it("fetches admin settings via GET /api/admin/settings", () => {
      settingsAdminApi.get();
      expect(apiClient.get).toHaveBeenCalledWith("/api/admin/settings");
    });

    it("returns ClientSettings type", () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: defaultSettings });
      expect(settingsAdminApi.get()).toBeDefined();
    });
  });

  describe("update", () => {
    it("updates settings via PUT /api/admin/settings", () => {
      settingsAdminApi.update(defaultSettings);
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
        allowedCorsOrigins: [],
        maxChecksumUploadSize: 0,
      };

      settingsAdminApi.update(settings);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/settings", settings);
    });

    it("can update single field", () => {
      const partial: Partial<ClientSettings> = { title: "New Title" };
      settingsAdminApi.update({ ...defaultSettings, ...partial });
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/settings", expect.objectContaining({ title: "New Title" }));
    });

    it("sends empty strings for baseUrl when not set", () => {
      const settings: ClientSettings = { ...defaultSettings, baseUrl: "" };
      settingsAdminApi.update(settings);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/settings", settings);
    });
  });
});

describe("ClientSettings type", () => {
    it("has correct structure with all fields", () => {
      expect(defaultSettings.title).toBe("Cloud Maven");
      expect(defaultSettings.anonymousRead).toBe(true);
      expect(defaultSettings.allowOverwrite).toBe(false);
      expect(defaultSettings.allowedCorsOrigins).toEqual([]);
      expect(defaultSettings.maxChecksumUploadSize).toBe(0);
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
        allowedCorsOrigins: [],
        maxChecksumUploadSize: 0,
      };
      expect(minimal.title).toBe("Minimal");
      expect(minimal.maintainMetadata).toBe(false);
    });

    it("defaultRepository is empty string (no release/snapshot distinction)", () => {
      expect(defaultSettings.defaultRepository).toBe("");
    });
  });
});