import type { AccessToken, AccessPermission, AccessSession } from '../env'
import { badRequest, conflict, forbidden, internalError, notFound } from '../shared'

const KV_PREFIX_TOKEN = 'token:'
const KV_PREFIX_TOKEN_NAME = 'token-name:'
const KV_PREFIX_SESSION = 'session:'

const PBKDF2_ITERATIONS = 100000

async function deriveSecret(secret: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    256
  )
  const bytes = new Uint8Array(bits)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

export async function hashSecret(secret: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveSecret(secret, saltBytes)
  return {
    hash,
    salt: Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
  }
}

export async function verifySecret(
  secret: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const saltBytes = new Uint8Array(
    storedSalt.match(/.{2}/g)?.map(b => parseInt(b, 16)) ?? []
  )
  if (saltBytes.length === 0) return false
  const hash = await deriveSecret(secret, saltBytes)
  return hash === storedHash
}

export async function createToken(
  kv: KVNamespace,
  name: string,
  secret: string,
  permissions: AccessPermission[],
  description?: string
): Promise<AccessToken> {
  const existing = await kv.get(`${KV_PREFIX_TOKEN_NAME}${name}`)
  if (existing) throw conflict(`Token "${name}" already exists`)

  const { hash, salt } = await hashSecret(secret)
  const token: AccessToken = {
    id: crypto.randomUUID(),
    name,
    secretHash: hash,
    salt,
    description,
    createdAt: new Date().toISOString(),
    permissions,
  }

  await kv.put(`${KV_PREFIX_TOKEN}${token.id}`, JSON.stringify(token))
  await kv.put(`${KV_PREFIX_TOKEN_NAME}${name}`, token.id)

  return token
}

export async function getToken(kv: KVNamespace, id: string): Promise<AccessToken | null> {
  const raw = await kv.get(`${KV_PREFIX_TOKEN}${id}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    throw internalError('Failed to parse token')
  }
}

export async function getTokenByName(kv: KVNamespace, name: string): Promise<AccessToken | null> {
  const id = await kv.get(`${KV_PREFIX_TOKEN_NAME}${name}`)
  if (!id) return null
  return getToken(kv, id)
}

export async function listTokens(kv: KVNamespace): Promise<AccessToken[]> {
  const result = await kv.list({ prefix: KV_PREFIX_TOKEN })
  const tokens: AccessToken[] = []
  for (const key of result.keys) {
    const raw = await kv.get(key.name)
    if (raw) {
      try {
        tokens.push(JSON.parse(raw))
      } catch {
        // skip malformed tokens
      }
    }
  }
  return tokens.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function updateToken(
  kv: KVNamespace,
  id: string,
  patch: {
    name?: string
    description?: string
    disabled?: boolean
    permissions?: AccessPermission[]
    secret?: string
  }
): Promise<AccessToken> {
  const token = await getToken(kv, id)
  if (!token) throw notFound('Token not found')

  const isManager = token.permissions.some(p => p.actions.includes('manage'))
  const wouldLoseManage = patch.permissions ? !patch.permissions.some(p => p.actions.includes('manage')) : false
  const wouldBeDisabled = patch.disabled === true

  if (isManager && (wouldLoseManage || wouldBeDisabled)) {
    const tokens = await listTokens(kv)
    const otherEnabledManagers = tokens.filter(t =>
      t.id !== id &&
      !t.disabled &&
      t.permissions.some(p => p.actions.includes('manage'))
    )
    if (otherEnabledManagers.length === 0) {
      throw forbidden('Cannot remove or disable the last enabled manager token')
    }
  }

  if (patch.name && patch.name !== token.name) {
    if (!/^[A-Za-z0-9_.-]+$/.test(patch.name)) throw badRequest('Token name contains unsupported characters')
    if (patch.name.length > 128) throw badRequest('Token name must not exceed 128 characters')
    const existingByName = await kv.get(`${KV_PREFIX_TOKEN_NAME}${patch.name}`)
    if (existingByName && existingByName !== id) {
      throw conflict(`Token "${patch.name}" already exists`)
    }
    await kv.delete(`${KV_PREFIX_TOKEN_NAME}${token.name}`)
    token.name = patch.name
    await kv.put(`${KV_PREFIX_TOKEN_NAME}${token.name}`, id)
  }

  if (patch.secret) {
    const { hash, salt } = await hashSecret(patch.secret)
    token.secretHash = hash
    token.salt = salt
  }

  if (patch.description !== undefined) token.description = patch.description
  if (patch.disabled !== undefined) token.disabled = patch.disabled
  if (patch.permissions) token.permissions = patch.permissions

  await kv.put(`${KV_PREFIX_TOKEN}${id}`, JSON.stringify(token))
  return token
}

export async function deleteToken(kv: KVNamespace, id: string): Promise<void> {
  const token = await getToken(kv, id)
  if (!token) throw notFound('Token not found')

  const tokens = await listTokens(kv)
  const managerTokens = tokens.filter(
    t => t.id !== id && t.permissions.some(p => p.actions.includes('manage'))
  )

  if (tokens.length === 1 && token.permissions.some(p => p.actions.includes('manage'))) {
    throw forbidden('Cannot delete the last manager token')
  }

  if (managerTokens.length === 0 && token.permissions.some(p => p.actions.includes('manage'))) {
    throw forbidden('Cannot delete the last manager token')
  }

  await kv.delete(`${KV_PREFIX_TOKEN}${id}`)
  await kv.delete(`${KV_PREFIX_TOKEN_NAME}${token.name}`)
}

export async function validateToken(
  kv: KVNamespace,
  name: string,
  secret: string,
  bootstrapSecret?: string
): Promise<AccessToken | null> {
  let token = await getTokenByName(kv, name)
  if (!token && bootstrapSecret) {
    await ensureAdminToken(kv, bootstrapSecret)
    token = await getTokenByName(kv, name)
  }
  if (!token) return null
  if (token.disabled) return null

  const valid = await verifySecret(secret, token.secretHash, token.salt)
  if (!valid) return null

  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return null

  return token
}

export async function createSession(
  kv: KVNamespace,
  token: AccessToken,
  ttlSeconds: number
): Promise<AccessSession> {
  const now = Date.now()
  const session: AccessSession = {
    id: crypto.randomUUID(),
    tokenId: token.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
  }

  await kv.put(`${KV_PREFIX_SESSION}${session.id}`, JSON.stringify(session), {
    expirationTtl: ttlSeconds,
  })

  return session
}

export async function getSession(kv: KVNamespace, id: string): Promise<AccessSession | null> {
  const raw = await kv.get(`${KV_PREFIX_SESSION}${id}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    throw internalError('Failed to parse session')
  }
}

export async function getTokenBySession(kv: KVNamespace, id: string): Promise<AccessToken | null> {
  const session = await getSession(kv, id)
  if (!session) return null
  if (new Date(session.expiresAt) < new Date()) return null

  const token = await getToken(kv, session.tokenId)
  if (!token || token.disabled) return null
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return null

  return token
}

export async function deleteSession(kv: KVNamespace, id: string): Promise<void> {
  await kv.delete(`${KV_PREFIX_SESSION}${id}`)
}

export async function ensureAdminToken(kv: KVNamespace, bootstrapSecret?: string): Promise<void> {
  const tokens = await listTokens(kv)
  if (tokens.length > 0) return

  if (!bootstrapSecret) return

  await createToken(kv, 'admin', bootstrapSecret, [
    { path: '/', actions: ['read', 'write', 'delete', 'manage'] },
  ], 'Default administrator')
}

export function hasPermission(
  permissions: AccessPermission[],
  path: string,
  action: string
): boolean {
  if (action === 'manage') {
    return permissions.some(p => p.actions.includes('manage'))
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const matchedPath = permissions
    .filter(p => {
      const permPath = p.path.endsWith('/') ? p.path.slice(0, -1) : p.path
      if (permPath === '' || permPath === '/') {
        return normalizedPath === '/' || normalizedPath.startsWith('/')
      }
      return normalizedPath === permPath || normalizedPath.startsWith(`${permPath}/`)
    })
    .sort((a, b) => {
      const aPath = a.path.endsWith('/') ? a.path.slice(0, -1) : a.path
      const bPath = b.path.endsWith('/') ? b.path.slice(0, -1) : b.path
      return bPath.length - aPath.length
    })[0]

  if (!matchedPath) return false

  return matchedPath.actions.includes(action as 'read' | 'write' | 'delete' | 'manage')
}
