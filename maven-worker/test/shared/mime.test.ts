import { describe, expect, it } from 'vitest'

import { getCacheControl, getContentType, isChecksumFile, isMetadataFile, isSnapshotArtifact } from '../../src/shared'

describe('Maven MIME and cache helpers', () => {
  it('returns Maven-specific content types', () => {
    expect(getContentType('com/example/demo/1.0.0/demo-1.0.0.jar')).toBe('application/java-archive')
    expect(getContentType('com/example/demo/1.0.0/demo-1.0.0.pom')).toBe('application/xml')
    expect(getContentType('com/example/demo/maven-metadata.xml')).toBe('application/xml')
    expect(getContentType('com/example/demo/1.0.0/demo-1.0.0.unknown')).toBe('application/octet-stream')
  })

  it('uses immutable caching for releases and no-cache for snapshots or metadata', () => {
    expect(getCacheControl('com/example/demo/1.0.0/demo-1.0.0.jar')).toBe('public, max-age=31536000, immutable')
    expect(getCacheControl('com/example/demo/1.0.0-SNAPSHOT/demo-1.0.0-SNAPSHOT.jar')).toBe('no-cache')
    expect(getCacheControl('com/example/demo/maven-metadata.xml')).toBe('no-cache')
  })

  it('classifies checksum, metadata, and snapshot artifacts', () => {
    expect(isChecksumFile('demo-1.0.0.jar.sha256')).toBe(true)
    expect(isChecksumFile('demo-1.0.0.jar.asc')).toBe(false)
    expect(isMetadataFile('com/example/demo/maven-metadata.xml')).toBe(true)
    expect(isMetadataFile('com/example/demo/metadata.xml')).toBe(false)
    expect(isSnapshotArtifact('com/example/demo/1.0.0-SNAPSHOT/demo.jar')).toBe(true)
  })
})
