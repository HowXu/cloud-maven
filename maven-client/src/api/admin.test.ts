import { describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { adminApi } from "@/api/admin";
import type { AccessPermission } from "@/types";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("adminApi", () => {
  it("uses the agreed Admin endpoints", () => {
    const permissions: AccessPermission[] = [{ path: "/", actions: ["read", "write"] }];

    adminApi.stats();
    adminApi.tokens();
    adminApi.createToken({ name: "publisher", permissions });
    adminApi.updateToken("token-1", { enabled: false });
    adminApi.deleteToken("token-1");

    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/api/admin/stats");
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/api/admin/tokens");
    expect(apiClient.post).toHaveBeenCalledWith("/api/admin/tokens", {
      name: "publisher",
      permissions,
    });
    expect(apiClient.put).toHaveBeenCalledWith("/api/admin/tokens/token-1", {
      enabled: false,
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/api/admin/tokens/token-1");
  });
});
