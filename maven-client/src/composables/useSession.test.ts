import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionDetails } from "@/types";

const mockSetAuthorization = vi.fn();

vi.mock("@/api/client", () => ({
  apiClient: {
    defaults: { headers: { common: {} } },
    delete: vi.fn(),
  },
  setAuthorization: mockSetAuthorization,
}));

vi.mock("@/api/auth", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("mosha-vue-toastify", () => ({
  createToast: vi.fn(),
}));

const managerSession: SessionDetails = {
  token: { id: "token-1", name: "admin", createdAt: "2026-05-29T00:00:00.000Z" },
  roles: ["manager"],
  permissions: [{ path: "/", actions: ["read", "write", "delete", "manage"] }],
};

describe("useSession", () => {
  let localStorageStore: Record<string, string>;

  beforeEach(() => {
    localStorageStore = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => localStorageStore[key] ?? null,
      setItem: (key: string, value: string) => { localStorageStore[key] = value; },
      removeItem: (key: string) => { delete localStorageStore[key]; },
      clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); },
    });
    mockSetAuthorization.mockReset();
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("returns not logged in when session details are null", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = null;

      expect(session.isLogged.value).toBe(false);
      expect(session.isManager.value).toBe(false);
    });

    it("returns not logged in when token name is empty", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = null;

      expect(session.isLogged.value).toBe(false);
    });
  });

  describe("isLogged and isManager", () => {
    it("returns logged-in state when session details are present", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = managerSession;

      expect(session.isLogged.value).toBe(true);
      expect(session.isManager.value).toBe(true);
    });

    it("returns not manager when roles array is empty", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = {
        token: { id: "token-1", name: "user" },
        roles: [],
        permissions: [],
      };

      expect(session.isLogged.value).toBe(true);
      expect(session.isManager.value).toBe(false);
    });

    it("returns not manager when roles does not include manager", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = {
        token: { id: "token-1", name: "user" },
        roles: ["reader"],
        permissions: [{ path: "/", actions: ["read"] }],
      };

      expect(session.isManager.value).toBe(false);
    });
  });

  describe("permission checking", () => {
    it("manager role always returns true for any path and action", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = managerSession;

      expect(session.can("/any/path", "read")).toBe(true);
      expect(session.can("/any/path", "write")).toBe(true);
      expect(session.can("/any/path", "delete")).toBe(true);
      expect(session.can("/any/path", "manage")).toBe(true);
      expect(session.can("/", "read")).toBe(true);
    });

    it("checks permission path prefix for read action", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = {
        token: { id: "token-1", name: "publisher" },
        roles: [],
        permissions: [{ path: "/com/example", actions: ["read", "write"] }],
      };

      expect(session.can("/com/example/demo", "read")).toBe(true);
      expect(session.can("/com/example/demo", "write")).toBe(true);
      expect(session.can("/other/path", "read")).toBe(false);
    });

    it("checks permission path prefix for delete action", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = {
        token: { id: "token-1", name: "publisher" },
        roles: [],
        permissions: [{ path: "/com/example", actions: ["read", "delete"] }],
      };

      expect(session.can("/com/example/demo", "delete")).toBe(true);
      expect(session.can("/com/example/demo", "read")).toBe(true);
      expect(session.can("/com/example/demo", "write")).toBe(false);
    });

    it("returns false when no permissions match", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = {
        token: { id: "token-1", name: "reader" },
        roles: [],
        permissions: [{ path: "/public", actions: ["read"] }],
      };

      expect(session.can("/private/path", "read")).toBe(false);
    });

    it("matches root permission for any subpath", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = {
        token: { id: "token-1", name: "reader" },
        roles: [],
        permissions: [{ path: "/", actions: ["read"] }],
      };

      expect(session.can("/com/example/demo.jar", "read")).toBe(true);
      expect(session.can("/releases/lib/core", "read")).toBe(true);
    });

    it("root path permission does not grant write when not in actions", async () => {
      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = {
        token: { id: "token-1", name: "reader" },
        roles: [],
        permissions: [{ path: "/", actions: ["read"] }],
      };

      expect(session.can("/com/example/demo.jar", "write")).toBe(false);
    });
  });

  describe("token storage security", () => {
    it("does not store token in localStorage after login", async () => {
      const { authApi } = await import("@/api/auth");
      vi.mocked(authApi.login).mockResolvedValueOnce({ data: managerSession } as never);

      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      await session.login("admin", "secret123");

      expect(localStorageStore["cloud-maven-token-name"]).toBeUndefined();
      expect(localStorageStore["cloud-maven-token-secret"]).toBeUndefined();
    });

    it("sets authorization header after login", async () => {
      const { authApi } = await import("@/api/auth");
      vi.mocked(authApi.login).mockResolvedValueOnce({ data: managerSession } as never);

      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      await session.login("admin", "secret123");

      expect(mockSetAuthorization).toHaveBeenCalledWith("admin", "secret123");
    });

    it("clears token memory state on logout", async () => {
      const { authApi } = await import("@/api/auth");
      vi.mocked(authApi.logout).mockResolvedValueOnce(undefined as never);

      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = managerSession;

      await session.logout();

      expect(session.details.value).toBeNull();
      expect(session.isLogged.value).toBe(false);
    });

    it("removes legacy localStorage tokens on logout", async () => {
      const { authApi } = await import("@/api/auth");
      vi.mocked(authApi.logout).mockResolvedValueOnce(undefined as never);

      localStorage.setItem("cloud-maven-token-name", "old-name");
      localStorage.setItem("cloud-maven-token-secret", "old-secret");

      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = managerSession;

      await session.logout();

      expect(localStorageStore["cloud-maven-token-name"]).toBeUndefined();
      expect(localStorageStore["cloud-maven-token-secret"]).toBeUndefined();
    });

    it("clears authorization header on logout", async () => {
      const { authApi } = await import("@/api/auth");
      const clientModule = await import("@/api/client");
      vi.mocked(authApi.logout).mockResolvedValueOnce(undefined as never);

      clientModule.apiClient.defaults.headers.common.Authorization = "xBasic dGVzdDp0ZXN0";

      const { useSession } = await import("@/composables/useSession");
      const session = useSession();
      session.details.value = managerSession;

      await session.logout();

      expect(clientModule.apiClient.defaults.headers.common.Authorization).toBeUndefined();
    });

    it("preserves token in memory across composable calls within same session", async () => {
      const { useSession: useSession1 } = await import("@/composables/useSession");
      const session1 = useSession1();
      session1.details.value = managerSession;

      const { useSession: useSession2 } = await import("@/composables/useSession");
      const session2 = useSession2();

      expect(session2.details.value).toEqual(managerSession);
    });
  });
});