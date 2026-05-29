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

  it("infers artifact coordinates without treating long group paths as versions", () => {
    const { coordinatesFromPath } = useMavenMetadata();

    expect(coordinatesFromPath("releases/com/example/platform/core/demo")).toEqual({
      repository: "releases",
      groupId: "com.example.platform.core",
      artifactId: "demo",
    });
  });

  it("infers version coordinates when the final segment looks like a version", () => {
    const { coordinatesFromPath } = useMavenMetadata();

    expect(coordinatesFromPath("releases/com/example/demo/1.2.3")).toEqual({
      repository: "releases",
      groupId: "com.example",
      artifactId: "demo",
      version: "1.2.3",
    });
  });

  it("returns metadata candidates for both artifact and version paths", () => {
    const { metadataCandidates } = useMavenMetadata();

    expect(metadataCandidates("releases/com/example/demo/1.0.0")).toEqual([
      {
        source: "artifact",
        artifactPath: "releases/com/example/demo/1.0.0",
        metadataPath: "releases/com/example/demo/1.0.0/maven-metadata.xml",
        coordinates: {
          repository: "releases",
          groupId: "com.example.demo",
          artifactId: "1.0.0",
        },
      },
      {
        source: "version",
        artifactPath: "releases/com/example/demo",
        metadataPath: "releases/com/example/demo/maven-metadata.xml",
        coordinates: {
          repository: "releases",
          groupId: "com.example",
          artifactId: "demo",
          version: "1.0.0",
        },
      },
    ]);
  });

  it("parses Maven metadata XML used by dependency snippets", () => {
    const { parseMetadata } = useMavenMetadata();

    expect(parseMetadata(`
      <metadata>
        <groupId>com.example</groupId>
        <artifactId>demo</artifactId>
        <versioning>
          <latest>1.1.0</latest>
          <release>1.0.0</release>
          <versions>
            <version>0.9.0</version>
            <version>1.0.0</version>
          </versions>
          <lastUpdated>20260529010101</lastUpdated>
        </versioning>
      </metadata>
    `)).toEqual({
      groupId: "com.example",
      artifactId: "demo",
      latest: "1.1.0",
      release: "1.0.0",
      versions: ["0.9.0", "1.0.0"],
      lastUpdated: "20260529010101",
    });
  });

  it("returns null for malformed metadata XML", () => {
    const { parseMetadata } = useMavenMetadata();

    expect(parseMetadata("<<bad")).toBeNull();
  });

  it("merges metadata without overriding an explicit selected version", () => {
    const { mergeMetadata } = useMavenMetadata();

    expect(mergeMetadata({
      source: "version",
      artifactPath: "releases/com/example/demo",
      metadataPath: "releases/com/example/demo/maven-metadata.xml",
      coordinates: {
        repository: "releases",
        groupId: "com.example",
        artifactId: "demo",
        version: "1.0.0",
      },
    }, {
      groupId: "com.override",
      artifactId: "demo-override",
      latest: "1.2.0",
      release: "1.1.0",
      versions: ["1.0.0", "1.1.0", "1.2.0"],
    })).toEqual({
      repository: "releases",
      groupId: "com.override",
      artifactId: "demo-override",
      version: "1.0.0",
    });
  });
});
