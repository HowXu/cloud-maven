import type { Context } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import type { AppEnv } from '../env'
import { AppError } from './errors'

export type ApiErrorBody = {
  message: string
  code: string
  requestId?: string
}

export const jsonData = <T>(c: Context<AppEnv>, data: T, status: StatusCode = 200): Response => {
  return c.json(data, status as never)
}

export const jsonError = (c: Context<AppEnv>, error: AppError): Response => {
  const body: ApiErrorBody = {
    message: error.expose ? error.message : 'Internal server error',
    code: error.code
  }

  const requestId = c.get('requestId')
  if (requestId) {
    body.requestId = requestId
  }

  return c.json(body, error.status as never)
}

export const noContent = (c: Context<AppEnv>): Response => {
  return c.body(null, 204)
}
