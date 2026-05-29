import { describe, expect, it, vi } from "vitest";

import { createArtifactUrl, createXBasicHeader } from "@/api/client";

describe("api client helpers", () => {
  it("normalizes artifact URLs against the configured base URL", () => {
    expect(createArtifactUrl("releases/com/example/app/app.jar")).toBe("/releases/com/example/app/app.jar");
    expect(createArtifactUrl("/snapshots/com/example/app/app.jar")).toBe("/snapshots/com/example/app/app.jar");
  });

  it("creates Reposilite-style xBasic authorization headers", () => {
    vi.stubGlobal("window", {
      btoa: globalThis.btoa,
    });

    expect(createXBasicHeader("publisher", "secret")).toEqual({
      Authorization: "xBasic cHVibGlzaGVyOnNlY3JldA==",
    });

    vi.unstubAllGlobals();
  });
});
