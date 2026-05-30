import { beforeEach, describe, expect, it, vi } from "vitest";

import { mavenApi } from "@/api/maven";
import { useRepository } from "@/composables/useRepository";

vi.mock("@/api/maven", () => ({
  mavenApi: {
    details: vi.fn(),
  },
}));

vi.mock("mosha-vue-toastify", () => ({
  createToast: vi.fn(),
}));

const detailsFor = (path: string, canWrite = false) => ({
  path,
  parentPath: path === "/" ? null : `/${path.split("/").slice(0, -1).join("/")}`,
  canRead: true,
  canWrite,
  entries: [
    {
      name: "demo",
      path: `${path}/demo`,
      type: "DIRECTORY" as const,
      permissions: { read: true, write: false, delete: false },
    },
    {
      name: "demo.jar",
      path: `${path}/demo.jar`,
      type: "FILE" as const,
      size: 1024,
      contentType: "application/java-archive",
      permissions: { read: true, write: false, delete: false },
    },
  ],
});

describe("useRepository", () => {
  beforeEach(() => {
    vi.mocked(mavenApi.details).mockReset();
  });

  describe("load", () => {
    it("loads repository details and exposes entries plus write permission", async () => {
      const repo = useRepository();
      const details = detailsFor("releases", true);
      vi.mocked(mavenApi.details).mockResolvedValueOnce({ data: details } as Awaited<ReturnType<typeof mavenApi.details>>);

      await repo.load("releases");

      expect(mavenApi.details).toHaveBeenCalledWith("releases");
      expect(repo.details.value).toEqual(details);
      expect(repo.entries.value).toEqual(details.entries);
      expect(repo.canWrite.value).toBe(true);
      expect(repo.error.value).toBeNull();
    });

    it("uses cache when available without force", async () => {
      const repo = useRepository();
      const details = detailsFor("cache-test");
      vi.mocked(mavenApi.details).mockResolvedValueOnce({ data: details } as Awaited<ReturnType<typeof mavenApi.details>>);

      await repo.load("cache-test");
      await repo.load("cache-test");

      expect(mavenApi.details).toHaveBeenCalledTimes(1);
    });

    it("forces reload when cache is bypassed", async () => {
      const repo = useRepository();
      const details = detailsFor("releases");
      vi.mocked(mavenApi.details).mockResolvedValue({ data: details } as Awaited<ReturnType<typeof mavenApi.details>>);

      await repo.load("releases", true);
      await repo.load("releases", true);

      expect(mavenApi.details).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("clears details and records an error when loading fails", async () => {
      const repo = useRepository();
      vi.mocked(mavenApi.details).mockRejectedValueOnce(new Error("not found"));

      await expect(repo.load("missing")).rejects.toThrow("not found");

      expect(repo.details.value).toBeNull();
      expect(repo.entries.value).toEqual([]);
      expect(repo.canWrite.value).toBe(false);
      expect(repo.error.value).toBe("Directory is unavailable or you do not have permission to view it.");
    });
  });

  describe("refresh", () => {
    it("does nothing if no details loaded", async () => {
      const repo = useRepository();
      await repo.refresh();
      expect(mavenApi.details).not.toHaveBeenCalled();
    });
  });

  describe("entries computed", () => {
    it("exposes entries from details", async () => {
      const repo = useRepository();
      const details = detailsFor("releases");
      vi.mocked(mavenApi.details).mockResolvedValueOnce({ data: details } as Awaited<ReturnType<typeof mavenApi.details>>);

      await repo.load("releases");

      expect(repo.entries.value).toHaveLength(2);
      expect(repo.entries.value[0].type).toBe("DIRECTORY");
      expect(repo.entries.value[1].type).toBe("FILE");
    });

    it("returns empty array when no entries", async () => {
      const repo = useRepository();
      vi.mocked(mavenApi.details).mockResolvedValueOnce({ data: { path: "empty", parentPath: null, canRead: true, canWrite: false, entries: [] } } as Awaited<ReturnType<typeof mavenApi.details>>);

      await repo.load("empty");

      expect(repo.entries.value).toEqual([]);
    });
  });

  describe("canWrite computed", () => {
    it("returns true when canWrite is true in details", async () => {
      const repo = useRepository();
      const details = detailsFor("writable", true);
      vi.mocked(mavenApi.details).mockResolvedValueOnce({ data: details } as Awaited<ReturnType<typeof mavenApi.details>>);

      await repo.load("writable");

      expect(repo.canWrite.value).toBe(true);
    });

    it("returns false when canWrite is false in details", async () => {
      const repo = useRepository();
      const details = detailsFor("readonly", false);
      vi.mocked(mavenApi.details).mockResolvedValueOnce({ data: details } as Awaited<ReturnType<typeof mavenApi.details>>);

      await repo.load("readonly");

      expect(repo.canWrite.value).toBe(false);
    });

    it("returns false when details is null", () => {
      const repo = useRepository();
      expect(repo.canWrite.value).toBe(false);
    });
  });
});