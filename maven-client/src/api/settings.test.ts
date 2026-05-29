import { describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { settingsApi } from "@/api/settings";
import type { ClientSettings } from "@/types";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("settingsApi", () => {
  it("fetches settings via GET /api/admin/settings", () => {
    settingsApi.get();
    expect(apiClient.get).toHaveBeenCalledWith("/api/admin/settings");
  });

  it("updates settings via PUT /api/admin/settings", () => {
    const settings: ClientSettings = {
      title: "Cloud-Maven",
      baseUrl: "https://repo.example.com",
      defaultRepository: "releases",
      anonymousRead: true,
      allowOverwrite: false,
      generateChecksums: true,
      maintainMetadata: true,
    };

    settingsApi.update(settings);
    expect(apiClient.put).toHaveBeenCalledWith("/api/admin/settings", settings);
  });
});