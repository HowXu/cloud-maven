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
  describe("read operations", () => {
    it("fetches stats via GET /api/admin/stats", () => {
      adminApi.stats();
      expect(apiClient.get).toHaveBeenCalledWith("/api/admin/stats");
    });

    it("fetches token list via GET /api/admin/tokens", () => {
      adminApi.tokens();
      expect(apiClient.get).toHaveBeenCalledWith("/api/admin/tokens");
    });
  });

  describe("create operations", () => {
    it("creates a token with name and permissions", () => {
      const permissions: AccessPermission[] = [{ path: "/", actions: ["read", "write"] }];
      adminApi.createToken({ name: "publisher", permissions });
      expect(apiClient.post).toHaveBeenCalledWith("/api/admin/tokens", {
        name: "publisher",
        permissions,
      });
    });

    it("includes description when provided", () => {
      const permissions: AccessPermission[] = [{ path: "/", actions: ["read"] }];
      adminApi.createToken({ name: "ci-token", description: "CI pipeline", permissions });
      expect(apiClient.post).toHaveBeenCalledWith("/api/admin/tokens", {
        name: "ci-token",
        description: "CI pipeline",
        permissions,
      });
    });
  });

  describe("update operations", () => {
    it("updates token enabled state", () => {
      adminApi.updateToken("token-1", { enabled: false });
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/tokens/token-1", { enabled: false });
    });

    it("updates token name", () => {
      adminApi.updateToken("token-1", { name: "updated-name" });
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/tokens/token-1", { name: "updated-name" });
    });

    it("updates token description", () => {
      adminApi.updateToken("token-1", { description: "new description" });
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/tokens/token-1", { description: "new description" });
    });
  });

  describe("delete operations", () => {
    it("deletes a token by id", () => {
      adminApi.deleteToken("token-1");
      expect(apiClient.delete).toHaveBeenCalledWith("/api/admin/tokens/token-1");
    });
  });
});