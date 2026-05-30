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
    }
    await kv.put('config:settings', JSON.stringify(stored))

    const settings = await getSettings(kv)

    expect(settings.title).toBe('Custom Title')
    expect(settings.anonymousRead).toBe(false)
    expect(settings.allowOverwrite).toBe(true)
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
})