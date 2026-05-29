import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/api/client'
import { mavenApi } from '@/api/maven'

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('DeleteArtifactModal routing', () => {
  beforeEach(() => {
    vi.mocked(apiClient.delete).mockReset()
    vi.mocked(apiClient.get).mockReset()
  })

  it('calls deleteArtifact endpoint for DIRECTORY type', async () => {
    const entryPath = 'com/example/demo/1.0.0'
    await mavenApi.deleteArtifact(entryPath)

    expect(apiClient.delete).toHaveBeenCalledWith(`/api/maven/artifacts/${entryPath}`)
  })

  it('calls delete endpoint for FILE type', async () => {
    const entryPath = 'com/example/demo/1.0.0/demo.jar'
    await mavenApi.delete(entryPath)

    expect(apiClient.delete).toHaveBeenCalledWith(`/${entryPath}`)
  })
})