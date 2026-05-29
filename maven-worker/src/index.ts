import { Hono } from 'hono'
import type { AppEnv } from './env'
import { jsonData, jsonError, notFound, toAppError } from './shared'

const app = new Hono<AppEnv>()

app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set('requestId', requestId)
  try {
    await next()
  } finally {
    c.header('X-Request-Id', requestId)
  }
})

app.get('/api/status/health', (c) => {
  return jsonData(c, {
    status: 'ok'
  })
})

app.onError((error, c) => {
  return jsonError(c, toAppError(error))
})

app.notFound((c) => {
  return jsonError(c, notFound('Route not found'))
})

export default app
