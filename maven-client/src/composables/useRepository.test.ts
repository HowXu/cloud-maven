import { beforeEach, describe, expect, it, vi } from "vitest";

import { mavenApi } from "@/api/maven";
import { useRepository } from "@/composables/useRepository";
import type { RepositoryDetails } from "@/types";

vi.mock("@/api/maven", () => ({
  mavenApi: {
    details: vi.fn(),
  },
}));

vi.mock("mosha-vue-toastify", () => ({
  createToast: vi.fn(),
}));

const detailsFor = (path: string): RepositoryDetails => ({
  path,
  parentPath: null,
  canRead: true,
  canWrite: path.includes("writable"),
  entries: [
    {
      name: "demo",
      path: `${path}/demo`,
      type: "DIRECTORY",
      permissions: {
        read: true,
        write: false,
        delete: false,
      },
    },
  ],
});

describe("useRepository", () => {
  beforeEach(() => {
    vi.mocked(mavenApi.details).mockReset();
  });

  it("loads repository details and exposes entries plus write permission", async () => {
    const repo = useRepository();
    const details = detailsFor("writable-releases");
    vi.mocked(mavenApi.details).mockResolvedValueOnce({ data: details } as Awaited<ReturnType<typeof mavenApi.details>>);

    await repo.load("/writable-releases");

    expect(mavenApi.details).toHaveBeenCalledWith("writable-releases");
    expect(repo.details.value).toEqual(details);
    expect(repo.entries.value).toEqual(details.entries);
    expect(repo.canWrite.value).toBe(true);
    expect(repo.error.value).toBeNull();
  });

  it("caches directory details until a forced reload is requested", async () => {
    const repo = useRepository();
    const path = `cache-${crypto.randomUUID()}`;
    const first = detailsFor(path);
    const second = {
      ...first,
      canWrite: true,
    };

    vi.mocked(mavenApi.details)
      .mockResolvedValueOnce({ data: first } as Awaited<ReturnType<typeof mavenApi.details>>)
      .mockResolvedValueOnce({ data: second } as Awaited<ReturnType<typeof mavenApi.details>>);

    await repo.load(path);
    await repo.load(`/${path}`);

    expect(mavenApi.details).toHaveBeenCalledTimes(1);
    expect(repo.details.value).toEqual(first);

    await repo.load(path, true);

    expect(mavenApi.details).toHaveBeenCalledTimes(2);
    expect(repo.details.value).toEqual(second);
  });

  it("clears details and records an error when loading fails", async () => {
    const repo = useRepository();
    const path = `missing-${crypto.randomUUID()}`;
    vi.mocked(mavenApi.details).mockRejectedValueOnce(new Error("not found"));

    await expect(repo.load(path)).rejects.toThrow("not found");

    expect(repo.details.value).toBeNull();
    expect(repo.entries.value).toEqual([]);
    expect(repo.canWrite.value).toBe(false);
    expect(repo.error.value).toBe("Directory is unavailable or you do not have permission to view it.");
  });
});
