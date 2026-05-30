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
    const store: Record<string, string> = {}
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    })
    vi.restoreAllMocks()
  })

  it("returns logged-in state when session details are present", async () => {
    const { useSession } = await import("@/composables/useSession")
    const session = useSession()
    session.details.value = managerSession

    expect(session.isLogged.value).toBe(true)
    expect(session.isManager.value).toBe(true)
  })

  it("returns not logged in when session details are null", async () => {
    const { useSession } = await import("@/composables/useSession")
    const session = useSession()
    session.details.value = null

    expect(session.isLogged.value).toBe(false)
    expect(session.isManager.value).toBe(false)
  })

  it("checks permission path prefix for read/write/delete actions", async () => {
    const { useSession } = await import("@/composables/useSession")
    const session = useSession()
    session.details.value = {
      token: { id: "token-1", name: "publisher" },
      roles: [],
      permissions: [{ path: "/releases", actions: ["read", "write"] }],
    }

    expect(session.can("/releases/com/example", "read")).toBe(true)
    expect(session.can("/releases/com/example", "write")).toBe(true)
    expect(session.can("/releases/com/example", "delete")).toBe(false)
    expect(session.can("/snapshots", "read")).toBe(false)
  })

  it("manager role always returns true for any path action", async () => {
    const { useSession } = await import("@/composables/useSession")
    const session = useSession()
    session.details.value = managerSession

    expect(session.can("/any/path", "read")).toBe(true)
    expect(session.can("/any/path", "write")).toBe(true)
    expect(session.can("/any/path", "delete")).toBe(true)
    expect(session.can("/any/path", "manage")).toBe(true)
  })
})