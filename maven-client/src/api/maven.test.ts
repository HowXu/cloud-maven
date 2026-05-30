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

  describe("details", () => {
    it("fetches directory details via GET /api/maven/details/:path", () => {
      mavenApi.details("/com/example/demo");
      expect(apiClient.get).toHaveBeenCalledWith("/api/maven/details/com/example/demo");
    });

    it("normalizes path with leading slashes", () => {
      mavenApi.details("///com///example///demo");
      expect(apiClient.get).toHaveBeenCalledWith("/api/maven/details/com///example///demo");
    });

    it("handles root path", () => {
      mavenApi.details("/");
      expect(apiClient.get).toHaveBeenCalledWith("/api/maven/details/");
    });

    it("handles empty path", () => {
      mavenApi.details("");
      expect(apiClient.get).toHaveBeenCalledWith("/api/maven/details/");
    });
  });

  describe("content", () => {
    it("fetches text content via GET /:path with responseType text", () => {
      mavenApi.content("com/example/demo/maven-metadata.xml");
      expect(apiClient.get).toHaveBeenCalledWith("/com/example/demo/maven-metadata.xml", {
        responseType: "text",
      });
    });

    it("handles path with leading slash", () => {
      mavenApi.content("/com/example/demo/pom.xml");
      expect(apiClient.get).toHaveBeenCalledWith("/com/example/demo/pom.xml", {
        responseType: "text",
      });
    });
  });

  describe("download", () => {
    it("fetches blob content via GET /:path with responseType blob", () => {
      mavenApi.download("com/example/demo/1.0.0/demo.jar");
      expect(apiClient.get).toHaveBeenCalledWith("/com/example/demo/1.0.0/demo.jar", {
        responseType: "blob",
      });
    });

    it("handles path with leading slash", () => {
      mavenApi.download("/com/example/demo/1.0.0/demo.jar");
      expect(apiClient.get).toHaveBeenCalledWith("/com/example/demo/1.0.0/demo.jar", {
        responseType: "blob",
      });
    });
  });

  describe("upload", () => {
    it("uploads files with explicit checksum intent", () => {
      const file = { type: "application/java-archive" } as File;
      mavenApi.upload("com/example/demo/1.0.0/demo.jar", file, true);

      expect(apiClient.put).toHaveBeenCalledWith("/com/example/demo/1.0.0/demo.jar", file, {
        headers: {
          "Content-Type": "application/java-archive",
          "X-Generate-Checksums": "true",
        },
      });
    });

    it("defaults upload checksum generation to false", () => {
      const file = { type: "" } as File;
      mavenApi.upload("com/example/demo/1.0.0/demo.jar", file);

      expect(apiClient.put).toHaveBeenCalledWith("/com/example/demo/1.0.0/demo.jar", file, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Generate-Checksums": "false",
        },
      });
    });

    it("uploads with explicit false checksum generation", () => {
      const file = { type: "application/octet-stream" } as File;
      mavenApi.upload("com/example/demo/1.0.0/demo.jar", file, false);

      expect(apiClient.put).toHaveBeenCalledWith("/com/example/demo/1.0.0/demo.jar", file, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Generate-Checksums": "false",
        },
      });
    });

    it("handles path with leading slash", () => {
      const file = {} as File;
      mavenApi.upload("/releases/com/example/demo/1.0.0/demo.jar", file);

      expect(apiClient.put).toHaveBeenCalledWith("/releases/com/example/demo/1.0.0/demo.jar", file, expect.any(Object));
    });

    it("normalizes path by removing only leading slashes", () => {
      const file = {} as File;
      mavenApi.upload("///com///example///demo.jar", file);

      expect(apiClient.put).toHaveBeenCalledWith("/com///example///demo.jar", file, expect.any(Object));
    });
  });

  describe("delete", () => {
    it("deletes file via DELETE /:path", () => {
      mavenApi.delete("com/example/demo/1.0.0/demo.jar");
      expect(apiClient.delete).toHaveBeenCalledWith("/com/example/demo/1.0.0/demo.jar");
    });

    it("handles path with leading slash", () => {
      mavenApi.delete("/com/example/demo/1.0.0/demo.jar");
      expect(apiClient.delete).toHaveBeenCalledWith("/com/example/demo/1.0.0/demo.jar");
    });

    it("normalizes path by removing leading slash", () => {
      mavenApi.delete("/releases/com/example/demo/1.0.0/demo.jar");
      expect(apiClient.delete).toHaveBeenCalledWith("/releases/com/example/demo/1.0.0/demo.jar");
    });
  });

  describe("deleteArtifact", () => {
    it("deletes artifact directory via DELETE /api/maven/artifacts/:path", () => {
      mavenApi.deleteArtifact("com/example/demo/1.0.0");
      expect(apiClient.delete).toHaveBeenCalledWith("/api/maven/artifacts/com/example/demo/1.0.0");
    });

    it("handles path with leading slash", () => {
      mavenApi.deleteArtifact("/com/example/demo/1.0.0");
      expect(apiClient.delete).toHaveBeenCalledWith("/api/maven/artifacts/com/example/demo/1.0.0");
    });

    it("normalizes path by removing leading slash", () => {
      mavenApi.deleteArtifact("/releases/com/example/demo/1.0.0");
      expect(apiClient.delete).toHaveBeenCalledWith("/api/maven/artifacts/releases/com/example/demo/1.0.0");
    });

    it("handles root artifact path", () => {
      mavenApi.deleteArtifact("/");
      expect(apiClient.delete).toHaveBeenCalledWith("/api/maven/artifacts/");
    });
  });
});