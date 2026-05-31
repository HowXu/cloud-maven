import type { RepositoryPolicy, ClientSettings } from '../env'
import { badRequest } from '../shared'

const KV_KEY_REPOSITORY = 'config:repository'
const KV_KEY_SETTINGS = 'config:settings'

const DEFAULT_POLICY: RepositoryPolicy = {
  visibility: 'PUBLIC',
  allowOverwrite: false,
}

const DEFAULT_SETTINGS: ClientSettings = {
  title: 'Cloud-Maven',
  baseUrl: '',
  defaultRepository: 'Cloud Maven',
  anonymousRead: true,
  allowOverwrite: false,
  generateChecksums: false,
  maintainMetadata: false,
  allowedCorsOrigins: [],
  maxChecksumUploadSize: 50 * 1024 * 1024,
}

export async function getRepositoryPolicy(kv: KVNamespace | undefined): Promise<RepositoryPolicy> {
  if (!kv) return { ...DEFAULT_POLICY }
  const raw = await kv.get(KV_KEY_REPOSITORY)
  if (!raw) {
    const policy = { ...DEFAULT_POLICY }
    await kv.put(KV_KEY_REPOSITORY, JSON.stringify(policy))
    return policy
  }
  try {
    return JSON.parse(raw)
  } catch {
    console.error('[config] Failed to parse repository policy, resetting to defaults')
    await kv.put(KV_KEY_REPOSITORY, JSON.stringify(DEFAULT_POLICY))
    return { ...DEFAULT_POLICY }
  }
}

export async function updateRepositoryPolicy(
  kv: KVNamespace | undefined,
  patch: Partial<RepositoryPolicy>
): Promise<RepositoryPolicy> {
  const current = await getRepositoryPolicy(kv)
  const updated: RepositoryPolicy = { ...current, ...patch }
  if (kv) {
    await kv.put(KV_KEY_REPOSITORY, JSON.stringify(updated))
  }
  return updated
}

export async function getSettings(kv: KVNamespace | undefined): Promise<ClientSettings> {
  if (!kv) return { ...DEFAULT_SETTINGS }
  const raw = await kv.get(KV_KEY_SETTINGS)
  if (!raw) {
    await kv.put(KV_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS))
    return { ...DEFAULT_SETTINGS }
  }
  try {
    return JSON.parse(raw)
  } catch {
    console.error('[config] Failed to parse settings, resetting to defaults')
    await kv.put(KV_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS))
    return { ...DEFAULT_SETTINGS }
  }
}

export async function updateSettings(
  kv: KVNamespace | undefined,
  patch: Record<string, unknown>
): Promise<ClientSettings> {
  const current = await getSettings(kv)
  const validated: Partial<ClientSettings> = {}

  if (patch.title !== undefined) {
    if (typeof patch.title !== 'string') throw badRequest('title must be a string')
    if (patch.title.length > 100) throw badRequest('title must not exceed 100 characters')
    validated.title = patch.title
  }
  if (patch.baseUrl !== undefined) {
    if (typeof patch.baseUrl !== 'string') throw badRequest('baseUrl must be a string')
    if (patch.baseUrl.length > 500) throw badRequest('baseUrl must not exceed 500 characters')
    validated.baseUrl = patch.baseUrl
  }
  if (patch.defaultRepository !== undefined) {
    if (typeof patch.defaultRepository !== 'string') throw badRequest('defaultRepository must be a string')
    if (patch.defaultRepository.length > 100) throw badRequest('defaultRepository must not exceed 100 characters')
    validated.defaultRepository = patch.defaultRepository
  }
  if (patch.anonymousRead !== undefined) {
    if (typeof patch.anonymousRead !== 'boolean') throw badRequest('anonymousRead must be a boolean')
    validated.anonymousRead = patch.anonymousRead
  }
  if (patch.allowOverwrite !== undefined) {
    if (typeof patch.allowOverwrite !== 'boolean') throw badRequest('allowOverwrite must be a boolean')
    validated.allowOverwrite = patch.allowOverwrite
  }
  if (patch.generateChecksums !== undefined) {
    if (typeof patch.generateChecksums !== 'boolean') throw badRequest('generateChecksums must be a boolean')
    validated.generateChecksums = patch.generateChecksums
  }
  if (patch.maintainMetadata !== undefined) {
    if (typeof patch.maintainMetadata !== 'boolean') throw badRequest('maintainMetadata must be a boolean')
    validated.maintainMetadata = patch.maintainMetadata
  }
  if (patch.allowedCorsOrigins !== undefined) {
    if (!Array.isArray(patch.allowedCorsOrigins) || !patch.allowedCorsOrigins.every((o): o is string => typeof o === 'string')) {
      throw badRequest('allowedCorsOrigins must be a string array')
    }
    const originPattern = /^https?:\/\/[^/]+$/
    if (!patch.allowedCorsOrigins.every(o => originPattern.test(o))) {
      throw badRequest('allowedCorsOrigins must be valid origins (e.g. https://example.com)')
    }
    validated.allowedCorsOrigins = patch.allowedCorsOrigins
  }
  if (patch.maxChecksumUploadSize !== undefined) {
    if (typeof patch.maxChecksumUploadSize !== 'number' || patch.maxChecksumUploadSize < 0) {
      throw badRequest('maxChecksumUploadSize must be a non-negative number')
    }
    validated.maxChecksumUploadSize = patch.maxChecksumUploadSize
  }

  const updated: ClientSettings = { ...current, ...validated }

  const policyPatch: Partial<RepositoryPolicy> = {}
  if (patch.anonymousRead !== undefined) {
    policyPatch.visibility = patch.anonymousRead ? 'PUBLIC' : 'PRIVATE'
  }
  if (patch.allowOverwrite !== undefined) {
    policyPatch.allowOverwrite = patch.allowOverwrite
  }

  if (kv) {
    await kv.put(KV_KEY_SETTINGS, JSON.stringify(updated))
  }

  if (Object.keys(policyPatch).length > 0) {
    await updateRepositoryPolicy(kv, policyPatch)
  }

  return updated
}
