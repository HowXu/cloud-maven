import type { StatusCode } from 'hono/utils/http-status'

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: StatusCode
  readonly expose: boolean

  constructor(code: ErrorCode, message: string, status: StatusCode, expose = true) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.expose = expose
  }
}

export const badRequest = (message: string): AppError =>
  new AppError('BAD_REQUEST', message, 400)

export const unauthorized = (message = 'Authentication is required'): AppError =>
  new AppError('UNAUTHORIZED', message, 401)

export const forbidden = (message = 'Permission denied'): AppError =>
  new AppError('FORBIDDEN', message, 403)

export const notFound = (message = 'Resource not found'): AppError =>
  new AppError('NOT_FOUND', message, 404)

export const conflict = (message: string): AppError =>
  new AppError('CONFLICT', message, 409)

export const payloadTooLarge = (message: string): AppError =>
  new AppError('PAYLOAD_TOO_LARGE', message, 413)

export const internalError = (message = 'Internal server error'): AppError =>
  new AppError('INTERNAL_ERROR', message, 500, false)

export const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error && error.message) {
    return new AppError('INTERNAL_ERROR', error.message, 500, false)
  }

  return internalError()
}
