export interface ArtifactCoordinates {
  repository: string;
  groupId: string;
  artifactId: string;
  version?: string;
}

export interface MavenMetadata {
  groupId?: string;
  artifactId?: string;
  latest?: string;
  release?: string;
  versions: string[];
  lastUpdated?: string;
}

export interface MetadataCandidate {
  source: "artifact" | "version";
  artifactPath: string;
  metadataPath: string;
  coordinates: ArtifactCoordinates;
}

const splitPath = (path: string) =>
  path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

const textContent = (document: Document, selector: string) =>
  document.querySelector(selector)?.textContent?.trim() || undefined;

const looksLikeVersion = (segment: string) =>
  /^v?\d+(?:[._-][0-9A-Za-z]+)*(?:-SNAPSHOT)?$/i.test(segment) ||
  /^[0-9A-Za-z._-]+-SNAPSHOT$/i.test(segment);

const createArtifactCandidate = (parts: string[]): MetadataCandidate | null => {
  if (parts.length < 3) {
    return null;
  }

  const repository = parts[0];
  const artifactId = parts[parts.length - 1];
  const groupParts = parts.slice(1, -1);

  if (!repository || !artifactId || groupParts.length === 0) {
    return null;
  }

  const artifactPath = parts.join("/");

  return {
    source: "artifact",
    artifactPath,
    metadataPath: `${artifactPath}/maven-metadata.xml`,
    coordinates: {
      repository,
      groupId: groupParts.join("."),
      artifactId,
    },
  };
};

const createVersionCandidate = (parts: string[]): MetadataCandidate | null => {
  if (parts.length < 4) {
    return null;
  }

  const repository = parts[0];
  const version = parts[parts.length - 1];
  const artifactId = parts[parts.length - 2];
  const groupParts = parts.slice(1, -2);

  if (!repository || !artifactId || !version || groupParts.length === 0) {
    return null;
  }

  const artifactPath = parts.slice(0, -1).join("/");

  return {
    source: "version",
    artifactPath,
    metadataPath: `${artifactPath}/maven-metadata.xml`,
    coordinates: {
      repository,
      groupId: groupParts.join("."),
      artifactId,
      version,
    },
  };
};

export function useMavenMetadata() {
  const metadataCandidates = (path: string) => {
    const parts = splitPath(path);
    const artifactCandidate = createArtifactCandidate(parts);
    const versionCandidate = createVersionCandidate(parts);

    return [artifactCandidate, versionCandidate].filter((entry): entry is MetadataCandidate => entry !== null);
  };

  const parseMetadata = (source: string): MavenMetadata | null => {
    const document = new DOMParser().parseFromString(source, "application/xml");

    if (document.querySelector("parsererror")) {
      return null;
    }

    return {
      groupId: textContent(document, "metadata > groupId"),
      artifactId: textContent(document, "metadata > artifactId"),
      latest: textContent(document, "metadata > versioning > latest"),
      release: textContent(document, "metadata > versioning > release"),
      versions: [...document.querySelectorAll("metadata > versioning > versions > version")]
        .map((entry) => entry.textContent?.trim())
        .filter((entry): entry is string => Boolean(entry)),
      lastUpdated: textContent(document, "metadata > versioning > lastUpdated"),
    };
  };

  const coordinatesFromPath = (path: string): ArtifactCoordinates | null => {
    const parts = splitPath(path);
    const versionCandidate = createVersionCandidate(parts);

    if (versionCandidate && looksLikeVersion(parts[parts.length - 1])) {
      return versionCandidate.coordinates;
    }

    return createArtifactCandidate(parts)?.coordinates ?? null;
  };

  const mergeMetadata = (candidate: MetadataCandidate, metadata: MavenMetadata): ArtifactCoordinates => {
    const metadataVersion = candidate.coordinates.version
      || metadata.release
      || metadata.latest
      || metadata.versions.at(-1);

    return {
      repository: candidate.coordinates.repository,
      groupId: metadata.groupId || candidate.coordinates.groupId,
      artifactId: metadata.artifactId || candidate.coordinates.artifactId,
      version: metadataVersion,
    };
  };

  return {
    coordinatesFromPath,
    mergeMetadata,
    metadataCandidates,
    parseMetadata,
  };
}
