import { describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { authApi } from "@/api/auth";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("authApi", () => {
  it("fetches current session via GET /api/auth/me", () => {
    authApi.me();
    expect(apiClient.get).toHaveBeenCalledWith("/api/auth/me");
  });

  it("logs in via POST /api/auth/login with name and secret", () => {
    authApi.login({ name: "admin", secret: "secret123" });
    expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", {
      name: "admin",
      secret: "secret123",
    });
  });

  it("logs out via POST /api/auth/logout", () => {
    authApi.logout();
    expect(apiClient.post).toHaveBeenCalledWith("/api/auth/logout");
  });
});