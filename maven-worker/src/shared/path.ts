import { badRequest } from './errors'

const controlCharacters = /[\u0000-\u001F\u007F]/
const htmlMetacharacters = /[<>"']/

export type NormalizedPath = {
  value: string
  segments: string[]
  isRoot: boolean
}

export type NormalizePathOptions = {
  allowRoot?: boolean
  allowApiPath?: boolean
}

export const normalizeMavenPath = (
  input: string,
  options: NormalizePathOptions = {}
): NormalizedPath => {
  const allowRoot = options.allowRoot ?? false
  const allowApiPath = options.allowApiPath ?? false
  const raw = input

  if (raw !== raw.trim()) {
    throw badRequest('Path must not start or end with whitespace')
  }

  if (raw.length === 0 || raw === '/') {
    if (!allowRoot) {
      throw badRequest('Path must not be empty')
    }

    return {
      value: '',
      segments: [],
      isRoot: true
    }
  }

  if (controlCharacters.test(raw)) {
    throw badRequest('Path contains control characters')
  }

  if (raw.includes('\\')) {
    throw badRequest('Path must use forward slashes')
  }

  if (raw.includes('//')) {
    throw badRequest('Path must not contain repeated slashes')
  }

  if (htmlMetacharacters.test(raw)) {
    throw badRequest('Path contains unsupported characters')
  }

  const withoutLeadingSlash = raw.startsWith('/') ? raw.slice(1) : raw
  const value = withoutLeadingSlash.endsWith('/')
    ? withoutLeadingSlash.slice(0, -1)
    : withoutLeadingSlash

  if (value.length === 0) {
    if (!allowRoot) {
      throw badRequest('Path must not be empty')
    }

    return {
      value: '',
      segments: [],
      isRoot: true
    }
  }

  if (!allowApiPath && (value === 'api' || value.startsWith('api/'))) {
    throw badRequest('API paths are reserved')
  }

  const segments = value.split('/')
  for (const segment of segments) {
    if (segment.length === 0) {
      throw badRequest('Path contains an empty segment')
    }

    if (segment === '.' || segment.includes('..')) {
      throw badRequest('Path contains an unsafe directory operator')
    }
  }

  return {
    value,
    segments,
    isRoot: false
  }
}

export const normalizePermissionPath = (input: string): string => {
  const normalized = normalizeMavenPath(input, {
    allowRoot: true,
    allowApiPath: true
  })

  return normalized.isRoot ? '/' : `/${normalized.value}`
}

export const getParentPath = (path: string): string | null => {
  const normalized = normalizeMavenPath(path, {
    allowRoot: true,
    allowApiPath: true
  })

  if (normalized.isRoot || normalized.segments.length <= 1) {
    return null
  }

  return normalized.segments.slice(0, -1).join('/')
}

export const getPathName = (path: string): string => {
  const normalized = normalizeMavenPath(path, {
    allowRoot: true,
    allowApiPath: true
  })

  if (normalized.isRoot) {
    return ''
  }

  return normalized.segments[normalized.segments.length - 1]
}
