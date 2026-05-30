import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { authApi, type LoginPayload } from "@/api/auth";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("authApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  describe("me", () => {
    it("fetches current session via GET /api/auth/me", () => {
      authApi.me();
      expect(apiClient.get).toHaveBeenCalledWith("/api/auth/me");
    });

    it("returns expected response type", () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { token: { id: "1", name: "test" }, roles: [], permissions: [] } });
      expect(authApi.me()).toBeDefined();
    });
  });

  describe("login", () => {
    it("logs in via POST /api/auth/login with name and secret", () => {
      const payload: LoginPayload = { name: "admin", secret: "secret123" };
      authApi.login(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", payload);
    });

    it("sends correct payload structure", () => {
      const payload: LoginPayload = { name: "publisher", secret: "publish-secret" };
      authApi.login(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", {
        name: "publisher",
        secret: "publish-secret",
      });
    });

    it("handles empty credentials", () => {
      const payload: LoginPayload = { name: "", secret: "" };
      authApi.login(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", payload);
    });

    it("handles special characters in credentials", () => {
      const payload: LoginPayload = { name: "user@example.com", secret: "p@ss:word!" };
      authApi.login(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", payload);
    });
  });

  describe("logout", () => {
    it("logs out via POST /api/auth/logout", () => {
      authApi.logout();
      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/logout");
    });
  });

  describe("LoginPayload interface", () => {
    it("accepts valid payload", () => {
      const payload: LoginPayload = { name: "user", secret: "pass" };
      expect(payload.name).toBe("user");
      expect(payload.secret).toBe("pass");
    });

    it("allows empty values", () => {
      const payload: LoginPayload = { name: "", secret: "" };
      expect(payload.name).toBe("");
      expect(payload.secret).toBe("");
    });
  });
});