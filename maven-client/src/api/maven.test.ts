import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { mavenApi } from "@/api/maven";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("mavenApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.put).mockReset();
    vi.mocked(apiClient.delete).mockReset();
  });

  it("normalizes read endpoints for details, content, and downloads", () => {
    mavenApi.details("/releases/com/example/demo");
    mavenApi.content("/releases/com/example/demo/maven-metadata.xml");
    mavenApi.download("/releases/com/example/demo/1.0.0/demo.jar");

    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/api/maven/details/releases/com/example/demo");
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/releases/com/example/demo/maven-metadata.xml", {
      responseType: "text",
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(3, "/releases/com/example/demo/1.0.0/demo.jar", {
      responseType: "blob",
    });
  });

  it("uploads files with explicit checksum intent", () => {
    const file = { type: "application/java-archive" } as File;

    mavenApi.upload("/releases/com/example/demo/1.0.0/demo.jar", file, true);

    expect(apiClient.put).toHaveBeenCalledWith("/releases/com/example/demo/1.0.0/demo.jar", file, {
      headers: {
        "Content-Type": "application/java-archive",
        "X-Generate-Checksums": "true",
      },
    });
  });

  it("defaults upload checksum generation to false", () => {
    const file = { type: "" } as File;

    mavenApi.upload("releases/com/example/demo/1.0.0/demo.jar", file);

    expect(apiClient.put).toHaveBeenCalledWith("/releases/com/example/demo/1.0.0/demo.jar", file, {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Generate-Checksums": "false",
      },
    });
  });

  it("normalizes delete paths", () => {
    mavenApi.delete("/releases/com/example/demo/1.0.0/demo.jar");

    expect(apiClient.delete).toHaveBeenCalledWith("/releases/com/example/demo/1.0.0/demo.jar");
  });

  it("deletes artifact directories via the artifacts endpoint", () => {
    mavenApi.deleteArtifact("/releases/com/example/demo/1.0.0");

    expect(apiClient.delete).toHaveBeenCalledWith("/api/maven/artifacts/releases/com/example/demo/1.0.0");
  });
});
