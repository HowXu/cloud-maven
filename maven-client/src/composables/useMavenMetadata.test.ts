import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMavenMetadata } from "@/composables/useMavenMetadata";

class TestTextNode {
  constructor(readonly textContent: string | null) {}
}

const firstTagValue = (source: string, tag: string) => {
  const match = source.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, "i"));
  return match?.[1]?.trim();
};

const versionValues = (source: string) => {
  const versionsBlock = source.match(/<versions>\s*([\s\S]*?)\s*<\/versions>/i)?.[1] ?? "";
  return [...versionsBlock.matchAll(/<version>\s*([\s\S]*?)\s*<\/version>/gi)]
    .map((match) => match[1]?.trim())
    .filter((entry): entry is string => Boolean(entry));
};

class TestDocument {
  constructor(private readonly source: string) {}

  querySelector(selector: string) {
    if (selector === "parsererror") {
      return this.source.includes("<<bad") ? new TestTextNode("parse error") : null;
    }

    const selectorMap: Record<string, string> = {
      "metadata > groupId": "groupId",
      "metadata > artifactId": "artifactId",
      "metadata > versioning > latest": "latest",
      "metadata > versioning > release": "release",
      "metadata > versioning > lastUpdated": "lastUpdated",
    };
    const tag = selectorMap[selector];
    const value = tag ? firstTagValue(this.source, tag) : undefined;
    return value ? new TestTextNode(value) : null;
  }

  querySelectorAll(selector: string) {
    if (selector !== "metadata > versioning > versions > version") {
      return [];
    }
    return versionValues(this.source).map((value) => new TestTextNode(value));
  }
}

class TestDOMParser {
  parseFromString(source: string) {
    return new TestDocument(source) as unknown as Document;
  }
}

describe("useMavenMetadata", () => {
  beforeEach(() => {
    vi.stubGlobal("DOMParser", TestDOMParser);
  });

  describe("coordinatesFromPath", () => {
    it("extracts artifact coordinates from root level path", () => {
      const { coordinatesFromPath } = useMavenMetadata();
      expect(coordinatesFromPath("com/example/demo")).toEqual({
        repository: "com",
        groupId: "example",
        artifactId: "demo",
      });
    });

    it("extracts artifact coordinates from deeply nested path", () => {
      const { coordinatesFromPath } = useMavenMetadata();
      expect(coordinatesFromPath("com/example/platform/core/demo")).toEqual({
        repository: "com",
        groupId: "example.platform.core",
        artifactId: "demo",
      });
    });

    it("extracts version coordinates when path ends with version-like segment", () => {
      const { coordinatesFromPath } = useMavenMetadata();
      expect(coordinatesFromPath("com/example/demo/1.2.3")).toEqual({
        repository: "com",
        groupId: "example",
        artifactId: "demo",
        version: "1.2.3",
      });
    });

    it("extracts version coordinates with SNAPSHOT suffix", () => {
      const { coordinatesFromPath } = useMavenMetadata();
      expect(coordinatesFromPath("com/example/demo/1.0.0-SNAPSHOT")).toEqual({
        repository: "com",
        groupId: "example",
        artifactId: "demo",
        version: "1.0.0-SNAPSHOT",
      });
    });

    it("extracts version coordinates with v prefix", () => {
      const { coordinatesFromPath } = useMavenMetadata();
      expect(coordinatesFromPath("com/example/demo/v2.0.0")).toEqual({
        repository: "com",
        groupId: "example",
        artifactId: "demo",
        version: "v2.0.0",
      });
    });

    it("returns artifact coordinates for maven-metadata.xml path", () => {
      const { coordinatesFromPath } = useMavenMetadata();
      expect(coordinatesFromPath("com/example/demo/maven-metadata.xml")).toEqual({
        repository: "com",
        groupId: "example.demo",
        artifactId: "maven-metadata.xml",
      });
    });

    it("returns null for paths with fewer than 3 segments", () => {
      const { coordinatesFromPath } = useMavenMetadata();
      expect(coordinatesFromPath("com")).toBeNull();
      expect(coordinatesFromPath("com/example")).toBeNull();
    });

    it("returns null for empty path", () => {
      const { coordinatesFromPath } = useMavenMetadata();
      expect(coordinatesFromPath("")).toBeNull();
    });

    it("handles underscore and dash in version segment", () => {
      const { coordinatesFromPath } = useMavenMetadata();
      expect(coordinatesFromPath("com/example/demo/1_0_0-final")).toEqual({
        repository: "com",
        groupId: "example",
        artifactId: "demo",
        version: "1_0_0-final",
      });
    });
  });

  describe("metadataCandidates", () => {
    it("returns empty array for paths with fewer than 3 segments", () => {
      const { metadataCandidates } = useMavenMetadata();
      expect(metadataCandidates("com")).toEqual([]);
      expect(metadataCandidates("com/example")).toEqual([]);
    });

    it("returns artifact candidate for valid artifact path", () => {
      const { metadataCandidates } = useMavenMetadata();
      expect(metadataCandidates("com/example/demo")).toEqual([
        {
          source: "artifact",
          artifactPath: "com/example/demo",
          metadataPath: "com/example/demo/maven-metadata.xml",
          coordinates: {
            repository: "com",
            groupId: "example",
            artifactId: "demo",
          },
        },
      ]);
    });

    it("returns both artifact and version candidates for version path", () => {
      const { metadataCandidates } = useMavenMetadata();
      expect(metadataCandidates("com/example/demo/1.0.0")).toEqual([
        {
          source: "artifact",
          artifactPath: "com/example/demo/1.0.0",
          metadataPath: "com/example/demo/1.0.0/maven-metadata.xml",
          coordinates: {
            repository: "com",
            groupId: "example.demo",
            artifactId: "1.0.0",
          },
        },
        {
          source: "version",
          artifactPath: "com/example/demo",
          metadataPath: "com/example/demo/maven-metadata.xml",
          coordinates: {
            repository: "com",
            groupId: "example",
            artifactId: "demo",
            version: "1.0.0",
          },
        },
      ]);
    });

    it("filters out null candidates", () => {
      const { metadataCandidates } = useMavenMetadata();
      expect(metadataCandidates("com/example")).toEqual([]);
    });

    it("handles trailing slashes correctly", () => {
      const { metadataCandidates } = useMavenMetadata();
      expect(metadataCandidates("com/example/demo/")).toEqual([
        {
          source: "artifact",
          artifactPath: "com/example/demo",
          metadataPath: "com/example/demo/maven-metadata.xml",
          coordinates: {
            repository: "com",
            groupId: "example",
            artifactId: "demo",
          },
        },
      ]);
    });
  });

  describe("parseMetadata", () => {
    it("parses minimal metadata with only groupId and artifactId", () => {
      const { parseMetadata } = useMavenMetadata();
      expect(parseMetadata(`<metadata><groupId>com.example</groupId><artifactId>demo</artifactId></metadata>`)).toEqual({
        groupId: "com.example",
        artifactId: "demo",
        latest: undefined,
        release: undefined,
        versions: [],
        lastUpdated: undefined,
      });
    });

    it("parses metadata with versioning section and latest tag", () => {
      const { parseMetadata } = useMavenMetadata();
      expect(parseMetadata(`
        <metadata>
          <groupId>com.example</groupId>
          <artifactId>demo</artifactId>
          <versioning>
            <latest>1.1.0</latest>
            <versions>
              <version>0.9.0</version>
              <version>1.0.0</version>
              <version>1.1.0</version>
            </versions>
            <lastUpdated>20260529010101</lastUpdated>
          </versioning>
        </metadata>
      `)).toEqual({
        groupId: "com.example",
        artifactId: "demo",
        latest: "1.1.0",
        release: undefined,
        versions: ["0.9.0", "1.0.0", "1.1.0"],
        lastUpdated: "20260529010101",
      });
    });

    it("returns null for malformed XML", () => {
      const { parseMetadata } = useMavenMetadata();
      expect(parseMetadata("<<bad")).toBeNull();
    });

    it("returns null for empty string", () => {
      const { parseMetadata } = useMavenMetadata();
      expect(parseMetadata("")).toBeNull();
    });

    it("handles empty versions list", () => {
      const { parseMetadata } = useMavenMetadata();
      expect(parseMetadata(`<metadata><groupId>com.example</groupId><artifactId>demo</artifactId><versioning><versions></versions></versioning></metadata>`)).toEqual({
        groupId: "com.example",
        artifactId: "demo",
        latest: undefined,
        release: undefined,
        versions: [],
        lastUpdated: undefined,
      });
    });
  });

  describe("mergeMetadata", () => {
    it("prefers explicit version from candidate over metadata versions", () => {
      const { mergeMetadata } = useMavenMetadata();
      expect(mergeMetadata({
        source: "version",
        artifactPath: "com/example/demo",
        metadataPath: "com/example/demo/maven-metadata.xml",
        coordinates: {
          repository: "com",
          groupId: "example",
          artifactId: "demo",
          version: "1.0.0",
        },
      }, {
        groupId: "com.example",
        artifactId: "demo-override",
        latest: "2.0.0",
        release: undefined,
        versions: ["1.0.0", "2.0.0"],
      })).toEqual({
        repository: "com",
        groupId: "com.example",
        artifactId: "demo-override",
        version: "1.0.0",
      });
    });

    it("falls back to latest when no explicit version", () => {
      const { mergeMetadata } = useMavenMetadata();
      expect(mergeMetadata({
        source: "artifact",
        artifactPath: "com/example/demo",
        metadataPath: "com/example/demo/maven-metadata.xml",
        coordinates: {
          repository: "com",
          groupId: "example",
          artifactId: "demo",
        },
      }, {
        groupId: "example",
        artifactId: "demo",
        latest: "2.0.0",
        versions: ["1.0.0", "2.0.0"],
      })).toEqual({
        repository: "com",
        groupId: "example",
        artifactId: "demo",
        version: "2.0.0",
      });
    });

    it("falls back to last version when no latest", () => {
      const { mergeMetadata } = useMavenMetadata();
      expect(mergeMetadata({
        source: "artifact",
        artifactPath: "com/example/demo",
        metadataPath: "com/example/demo/maven-metadata.xml",
        coordinates: {
          repository: "com",
          groupId: "example",
          artifactId: "demo",
        },
      }, {
        groupId: "example",
        artifactId: "demo",
        versions: ["1.0.0", "2.0.0"],
      })).toEqual({
        repository: "com",
        groupId: "example",
        artifactId: "demo",
        version: "2.0.0",
      });
    });
  });
});