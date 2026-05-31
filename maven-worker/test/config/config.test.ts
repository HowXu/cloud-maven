import { describe, expect, it } from 'vitest'

import {
  getRepositoryPolicy,
  updateRepositoryPolicy,
  getSettings,
  updateSettings,
} from '../../src/config'
import type { RepositoryPolicy, ClientSettings } from '../../src/env'

const mockKv = () => {
  const store: Record<string, string> = {}
  return {
    get: async (key: string) => store[key] ?? null,
    put: async (key: string, value: string) => { store[key] = value },
    delete: async (key: string) => { delete store[key] },
  } as unknown as KVNamespace
}

describe('config repository policy', () => {
  it('returns default policy when KV is empty', async () => {
    const kv = mockKv()

    const policy = await getRepositoryPolicy(kv)

    expect(policy.visibility).toBe('PUBLIC')
    expect(policy.allowOverwrite).toBe(false)
  })

  it('persists and returns stored policy', async () => {
    const kv = mockKv()
    const stored: RepositoryPolicy = {
      visibility: 'PRIVATE',
      allowOverwrite: true,
    }
    await kv.put('config:repository', JSON.stringify(stored))

    const policy = await getRepositoryPolicy(kv)

    expect(policy.visibility).toBe('PRIVATE')
    expect(policy.allowOverwrite).toBe(true)
  })

  it('merges partial updates into existing policy', async () => {
    const kv = mockKv()
    await kv.put('config:repository', JSON.stringify({
      visibility: 'PUBLIC',
      allowOverwrite: false,
    }))

    const updated = await updateRepositoryPolicy(kv, { visibility: 'PRIVATE' })

    expect(updated.visibility).toBe('PRIVATE')
    expect(updated.allowOverwrite).toBe(false)
  })
})

describe('config settings', () => {
  it('returns default settings when KV is empty', async () => {
    const kv = mockKv()

    const settings = await getSettings(kv)

    expect(settings.title).toBe('Cloud-Maven')
    expect(settings.baseUrl).toBe('')
    expect(settings.defaultRepository).toBe('Cloud Maven')
    expect(settings.anonymousRead).toBe(true)
    expect(settings.allowOverwrite).toBe(false)
    expect(settings.generateChecksums).toBe(false)
    expect(settings.maintainMetadata).toBe(false)
    expect(settings.allowedCorsOrigins).toEqual([])
    expect(settings.maxChecksumUploadSize).toBe(50 * 1024 * 1024)
  })

  it('persists and retrieves stored settings', async () => {
    const kv = mockKv()
    const stored: ClientSettings = {
      title: 'Custom Title',
      baseUrl: 'https://custom.example.com',
      defaultRepository: '',
      anonymousRead: false,
      allowOverwrite: true,
      generateChecksums: true,
      maintainMetadata: true,
      allowedCorsOrigins: ['https://example.com'],
      maxChecksumUploadSize: 10 * 1024 * 1024,
    }
    await kv.put('config:settings', JSON.stringify(stored))

    const settings = await getSettings(kv)

    expect(settings.title).toBe('Custom Title')
    expect(settings.anonymousRead).toBe(false)
    expect(settings.allowOverwrite).toBe(true)
    expect(settings.allowedCorsOrigins).toEqual(['https://example.com'])
    expect(settings.maxChecksumUploadSize).toBe(10 * 1024 * 1024)
  })

  it('maps anonymousRead to visibility in policy', async () => {
    const kv = mockKv()
    await kv.put('config:settings', JSON.stringify({
      title: 'Test',
      baseUrl: '',
      defaultRepository: '',
      anonymousRead: true,
      allowOverwrite: false,
      generateChecksums: false,
      maintainMetadata: false,
      allowedCorsOrigins: [],
      maxChecksumUploadSize: 0,
    }))

    await updateSettings(kv, { anonymousRead: false })

    const policy = await getRepositoryPolicy(kv)
    expect(policy.visibility).toBe('PRIVATE')
  })

  it('maps allowOverwrite to allowOverwrite in policy', async () => {
    const kv = mockKv()

    await updateSettings(kv, { allowOverwrite: true })

    const policy = await getRepositoryPolicy(kv)
    expect(policy.allowOverwrite).toBe(true)
  })

  it('rejects title longer than 100 characters', async () => {
    const kv = mockKv()
    const longTitle = 'A'.repeat(101)

    await expect(updateSettings(kv, { title: longTitle })).rejects.toThrow('title must not exceed 100 characters')
  })

  it('rejects baseUrl longer than 500 characters', async () => {
    const kv = mockKv()
    const longUrl = `https://${'a'.repeat(490)}.com`

    await expect(updateSettings(kv, { baseUrl: longUrl })).rejects.toThrow('baseUrl must not exceed 500 characters')
  })

  it('rejects defaultRepository longer than 100 characters', async () => {
    const kv = mockKv()
    const longRepo = 'x'.repeat(101)

    await expect(updateSettings(kv, { defaultRepository: longRepo })).rejects.toThrow('defaultRepository must not exceed 100 characters')
  })

  it('accepts title at exactly 100 characters', async () => {
    const kv = mockKv()
    const title = 'A'.repeat(100)

    const result = await updateSettings(kv, { title })
    expect(result.title).toBe(title)
  })

  it('rejects allowedCorsOrigins with invalid URL format', async () => {
    const kv = mockKv()

    await expect(updateSettings(kv, { allowedCorsOrigins: ['not-a-valid-origin'] })).rejects.toThrow(
      'allowedCorsOrigins must be valid origins (e.g. https://example.com)',
    )
  })

  it('rejects allowedCorsOrigins with ftp protocol', async () => {
    const kv = mockKv()

    await expect(updateSettings(kv, { allowedCorsOrigins: ['ftp://example.com'] })).rejects.toThrow(
      'allowedCorsOrigins must be valid origins (e.g. https://example.com)',
    )
  })

  it('rejects allowedCorsOrigins with trailing path', async () => {
    const kv = mockKv()

    await expect(updateSettings(kv, { allowedCorsOrigins: ['https://example.com/path'] })).rejects.toThrow(
      'allowedCorsOrigins must be valid origins (e.g. https://example.com)',
    )
  })

  it('accepts allowedCorsOrigins with valid http and https origins', async () => {
    const kv = mockKv()
    const origins = ['https://example.com', 'http://localhost:5173']

    const result = await updateSettings(kv, { allowedCorsOrigins: origins })
    expect(result.allowedCorsOrigins).toEqual(origins)
  })

  it('rejects allowedCorsOrigins containing non-string element', async () => {
    const kv = mockKv()

    await expect(updateSettings(kv, { allowedCorsOrigins: [42 as unknown as string] })).rejects.toThrow(
      'allowedCorsOrigins must be a string array',
    )
  })
})