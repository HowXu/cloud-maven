import { describe, expect, it } from 'vitest'

import { parseMavenMetadata } from '../../src/maven'

describe('Maven metadata read-time calculation', () => {
  it('derives latest from versions array when latest tag is absent', () => {
    const xml = `
      <metadata>
        <groupId>com.example</groupId>
        <artifactId>demo</artifactId>
        <versioning>
          <versions>
            <version>0.9.0</version>
            <version>1.0.0</version>
            <version>1.1.0</version>
          </versions>
        </versioning>
      </metadata>
    `
    const result = parseMavenMetadata(xml)

    expect(result.latest).toBe('1.1.0')
    expect(result.versions).toEqual(['0.9.0', '1.0.0', '1.1.0'])
  })

  it('uses explicit latest tag when present', () => {
    const xml = `
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
        </versioning>
      </metadata>
    `
    const result = parseMavenMetadata(xml)

    expect(result.latest).toBe('1.1.0')
    expect(result.versions).toEqual(['0.9.0', '1.0.0', '1.1.0'])
  })

  it('handles version with SNAPSHOT suffix', () => {
    const xml = `
      <metadata>
        <groupId>com.example</groupId>
        <artifactId>demo</artifactId>
        <versioning>
          <versions>
            <version>1.0.0</version>
            <version>1.1.0-SNAPSHOT</version>
            <version>2.0.0</version>
          </versions>
        </versioning>
      </metadata>
    `
    const result = parseMavenMetadata(xml)

    expect(result.latest).toBe('2.0.0')
    expect(result.versions).toEqual(['1.0.0', '1.1.0-SNAPSHOT', '2.0.0'])
  })

  it('sorts release versions numerically for latest derivation', () => {
    const xml = `
      <metadata>
        <groupId>com.example</groupId>
        <artifactId>demo</artifactId>
        <versioning>
          <versions>
            <version>1.9.0</version>
            <version>1.10.0</version>
            <version>1.1.0</version>
          </versions>
        </versioning>
      </metadata>
    `
    const result = parseMavenMetadata(xml)

    expect(result.latest).toBe('1.10.0')
  })

  it('handles single version', () => {
    const xml = `
      <metadata>
        <groupId>com.example</groupId>
        <artifactId>demo</artifactId>
        <versioning>
          <versions>
            <version>1.0.0</version>
          </versions>
        </versioning>
      </metadata>
    `
    const result = parseMavenMetadata(xml)

    expect(result.latest).toBe('1.0.0')
  })

  it('handles empty versions array', () => {
    const xml = `
      <metadata>
        <groupId>com.example</groupId>
        <artifactId>demo</artifactId>
        <versioning>
          <versions>
          </versions>
        </versioning>
      </metadata>
    `
    const result = parseMavenMetadata(xml)

    expect(result.latest).toBeUndefined()
    expect(result.versions).toEqual([])
  })

  it('preserves original groupId and artifactId from metadata', () => {
    const xml = `
      <metadata>
        <groupId>com.example</groupId>
        <artifactId>my-artifact</artifactId>
        <versioning>
          <versions>
            <version>1.0.0</version>
          </versions>
        </versioning>
      </metadata>
    `
    const result = parseMavenMetadata(xml)

    expect(result.groupId).toBe('com.example')
    expect(result.artifactId).toBe('my-artifact')
  })
})