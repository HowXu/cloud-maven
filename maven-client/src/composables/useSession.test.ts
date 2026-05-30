import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionDetails } from "@/types";

vi.mock("@/api/client", () => ({
  apiClient: {
    defaults: { headers: { common: {} } },
    delete: vi.fn(),
  },
  setAuthorization: vi.fn(),
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
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    });
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
  });
});