import { Hono } from 'hono'
import type { AccessPermission, AppEnv } from '../env'
import { auth } from '../auth'
import { listTokens, createToken, updateToken, deleteToken } from '../tokens'
import { getRepositoryPolicy, getSettings, updateSettings } from '../config'
import { badRequest, jsonData, noContent, normalizePermissionPath } from '../shared'
import { summarizeObjects } from '../storage'

const authManager = auth({ permission: 'manage' })
type PermissionAction = AccessPermission['actions'][number]
const permissionActions = new Set<PermissionAction>(['read', 'write', 'delete', 'manage'])

function isPermissionAction(action: string): action is PermissionAction {
  return permissionActions.has(action as PermissionAction)
}

function normalizePermissions(input: Array<{ path: string; actions: string[] }> | undefined): AccessPermission[] {
  if (!input) {
    return [{ path: '/', actions: ['read'] }]
  }
  if (input.length === 0) {
    throw badRequest('At least one permission is required')
  }

  return input.map(permission => {
    if (!permission.path) {
      throw badRequest('Permission path is required')
    }

    const actions = Array.from(new Set(permission.actions ?? []))
    if (actions.length === 0) {
      throw badRequest('Permission actions are required')
    }

    const normalizedActions: PermissionAction[] = []
    for (const action of actions) {
      if (!isPermissionAction(action)) {
        throw badRequest(`Unsupported permission action: ${action}`)
      }
      normalizedActions.push(action)
    }

    return {
      path: normalizePermissionPath(permission.path),
      actions: normalizedActions,
    }
  })
}

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.get('/stats', authManager, async (c) => {
  const kv = c.env.MAVEN_KV
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  const [reqsRaw, errsRaw, objectStats] = await Promise.all([
    kv.get(`stats:daily:${today}:requests`),
    kv.get(`stats:daily:${today}:errors`),
    summarizeObjects(c.env.MAVEN_BUCKET),
  ])

  return jsonData(c, {
    repositories: 1,
    objects: objectStats.objects,
    storageBytes: objectStats.storageBytes,
    requests24h: Number(reqsRaw) || 0,
    errors24h: Number(errsRaw) || 0,
  })
})

adminRoutes.get('/tokens', authManager, async (c) => {
  const tokens = await listTokens(c.env.MAVEN_KV)
  return jsonData(c, tokens.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    enabled: !t.disabled,
    createdAt: t.createdAt,
    permissions: t.permissions,
  })))
})

adminRoutes.post('/tokens', authManager, async (c) => {
  const body = await c.req.json<{
    name: string
    description?: string
    permissions?: Array<{ path: string; actions: string[] }>
  }>().catch(() => null)

  if (!body || !body.name) throw badRequest('Token name is required')

  const secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  const token = await createToken(
    c.env.MAVEN_KV,
    body.name,
    secret,
    normalizePermissions(body.permissions),
    body.description,
  )

  return jsonData(c, {
    id: token.id,
    name: token.name,
    secret,
    description: token.description,
    enabled: !token.disabled,
    createdAt: token.createdAt,
    permissions: token.permissions,
  }, 201)
})

adminRoutes.put('/tokens/:id', authManager, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    description?: string
    enabled?: boolean
    permissions?: Array<{ path: string; actions: string[] }>
    secret?: string
  }>().catch(() => null)

  if (!body) throw badRequest('Invalid request body')

  const token = await updateToken(c.env.MAVEN_KV, id, {
    name: body.name,
    description: body.description,
    disabled: body.enabled !== undefined ? !body.enabled : undefined,
    permissions: body.permissions ? normalizePermissions(body.permissions) : undefined,
    secret: body.secret,
  })

  return jsonData(c, {
    id: token.id,
    name: token.name,
    description: token.description,
    enabled: !token.disabled,
    createdAt: token.createdAt,
    permissions: token.permissions,
  })
})

adminRoutes.delete('/tokens/:id', authManager, async (c) => {
  const id = c.req.param('id')
  await deleteToken(c.env.MAVEN_KV, id)
  return noContent(c)
})

adminRoutes.get('/settings', authManager, async (c) => {
  const policy = await getRepositoryPolicy(c.env.MAVEN_KV)
  const settings = await getSettings(c.env.MAVEN_KV)
  return jsonData(c, {
    title: settings.title,
    baseUrl: settings.baseUrl,
    defaultRepository: settings.defaultRepository,
    anonymousRead: policy.visibility === 'PUBLIC',
    allowOverwrite: policy.allowReleaseRedeploy,
    generateChecksums: settings.generateChecksums,
    maintainMetadata: settings.maintainMetadata,
  })
})

adminRoutes.put('/settings', authManager, async (c) => {
  const body = await c.req.json<{
    title?: string
    baseUrl?: string
    defaultRepository?: string
    anonymousRead?: boolean
    allowOverwrite?: boolean
    generateChecksums?: boolean
    maintainMetadata?: boolean
  }>().catch(() => null)

  if (!body) throw badRequest('Invalid request body')

  const settings = await updateSettings(c.env.MAVEN_KV, body)

  const policy = await getRepositoryPolicy(c.env.MAVEN_KV)

  return jsonData(c, {
    title: settings.title,
    baseUrl: settings.baseUrl,
    defaultRepository: settings.defaultRepository,
    anonymousRead: policy.visibility === 'PUBLIC',
    allowOverwrite: policy.allowReleaseRedeploy,
    generateChecksums: settings.generateChecksums,
    maintainMetadata: settings.maintainMetadata,
  })
})
