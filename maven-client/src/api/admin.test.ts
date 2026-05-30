import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { adminApi, type AccessTokenSummary, type CreateAccessTokenPayload, type CreateAccessTokenResponse, type UpdateAccessTokenPayload } from "@/api/admin";
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
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.put).mockReset();
    vi.mocked(apiClient.delete).mockReset();
  });

  describe("stats", () => {
    it("fetches stats via GET /api/admin/stats", () => {
      adminApi.stats();
      expect(apiClient.get).toHaveBeenCalledWith("/api/admin/stats");
    });

    it("returns expected AdminStats structure", () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          repositories: 5,
          objects: 100,
          storageBytes: 1024 * 1024 * 100,
          requests24h: 1000,
          errors24h: 5,
        },
      });
      expect(adminApi.stats()).toBeDefined();
    });
  });

  describe("tokens", () => {
    it("fetches token list via GET /api/admin/tokens", () => {
      adminApi.tokens();
      expect(apiClient.get).toHaveBeenCalledWith("/api/admin/tokens");
    });

    it("returns array of AccessTokenSummary", () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: [
          {
            id: "token-1",
            name: "admin-token",
            enabled: true,
            createdAt: "2026-05-29T00:00:00.000Z",
            permissions: [{ path: "/", actions: ["read", "write", "delete", "manage"] }],
          },
        ],
      });
      expect(adminApi.tokens()).toBeDefined();
    });
  });

  describe("createToken", () => {
    it("creates a token with name and permissions", () => {
      const permissions: AccessPermission[] = [{ path: "/", actions: ["read", "write"] }];
      const payload: CreateAccessTokenPayload = { name: "publisher", permissions };
      adminApi.createToken(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/api/admin/tokens", payload);
    });

    it("includes description when provided", () => {
      const permissions: AccessPermission[] = [{ path: "/", actions: ["read"] }];
      const payload: CreateAccessTokenPayload = { name: "ci-token", description: "CI pipeline", permissions };
      adminApi.createToken(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/api/admin/tokens", {
        name: "ci-token",
        description: "CI pipeline",
        permissions,
      });
    });

    it("creates token without description", () => {
      const permissions: AccessPermission[] = [{ path: "/releases", actions: ["read"] }];
      const payload: CreateAccessTokenPayload = { name: "reader", permissions };
      adminApi.createToken(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/api/admin/tokens", {
        name: "reader",
        permissions,
      });
    });

    it("accepts multiple actions per permission", () => {
      const permissions: AccessPermission[] = [{ path: "/", actions: ["read", "write", "delete", "manage"] }];
      const payload: CreateAccessTokenPayload = { name: "admin", permissions };
      adminApi.createToken(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/api/admin/tokens", payload);
    });
  });

  describe("updateToken", () => {
    it("updates token enabled state", () => {
      const payload: UpdateAccessTokenPayload = { enabled: false };
      adminApi.updateToken("token-1", payload);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/tokens/token-1", payload);
    });

    it("updates token name", () => {
      const payload: UpdateAccessTokenPayload = { name: "updated-name" };
      adminApi.updateToken("token-1", payload);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/tokens/token-1", payload);
    });

    it("updates token description", () => {
      const payload: UpdateAccessTokenPayload = { description: "new description" };
      adminApi.updateToken("token-1", payload);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/tokens/token-1", payload);
    });

    it("updates multiple fields at once", () => {
      const payload: UpdateAccessTokenPayload = { name: "new-name", description: "desc", enabled: true, permissions: [{ path: "/", actions: ["read"] }] };
      adminApi.updateToken("token-1", payload);
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/tokens/token-1", payload);
    });

    it("sends empty object when no fields specified", () => {
      adminApi.updateToken("token-1", {});
      expect(apiClient.put).toHaveBeenCalledWith("/api/admin/tokens/token-1", {});
    });
  });

  describe("deleteToken", () => {
    it("deletes a token by id", () => {
      adminApi.deleteToken("token-1");
      expect(apiClient.delete).toHaveBeenCalledWith("/api/admin/tokens/token-1");
    });

    it("deletes different token id", () => {
      adminApi.deleteToken("token-abc-123");
      expect(apiClient.delete).toHaveBeenCalledWith("/api/admin/tokens/token-abc-123");
    });
  });

  describe("type definitions", () => {
    it("AccessTokenSummary has correct structure", () => {
      const summary: AccessTokenSummary = {
        id: "token-1",
        name: "test-token",
        description: "A test token",
        enabled: true,
        createdAt: "2026-05-29T00:00:00.000Z",
        permissions: [{ path: "/", actions: ["read"] }],
      };
      expect(summary.id).toBe("token-1");
      expect(summary.enabled).toBe(true);
    });

    it("CreateAccessTokenResponse includes secret", () => {
      const response: CreateAccessTokenResponse = {
        id: "token-1",
        name: "new-token",
        enabled: true,
        createdAt: "2026-05-29T00:00:00.000Z",
        permissions: [],
        secret: "generated-secret-123",
      };
      expect(response.secret).toBe("generated-secret-123");
    });

    it("UpdateAccessTokenPayload allows partial updates", () => {
      const payload: UpdateAccessTokenPayload = {};
      expect(payload.name).toBeUndefined();
      expect(payload.enabled).toBeUndefined();
    });
  });
});