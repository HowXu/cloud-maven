import { describe, expect, it } from 'vitest'

import { hasPermission } from '../../src/tokens'
import type { AccessPermission } from '../../src/env'

describe('token permission matching', () => {
  const permissions: AccessPermission[] = [
    { path: '/', actions: ['read'] as const },
    { path: '/com/example', actions: ['read', 'write'] as const },
    { path: '/com/example/private', actions: ['read', 'delete'] as const },
    { path: '/admin', actions: ['manage'] as const },
  ]

  it('matches permissions by the longest path prefix', () => {
    expect(hasPermission(permissions, '/com/example/demo/app.jar', 'write')).toBe(true)
    expect(hasPermission(permissions, '/com/other/demo/app.jar', 'read')).toBe(true)
    expect(hasPermission(permissions, '/com/other/demo/app.jar', 'write')).toBe(false)
    expect(hasPermission(permissions, '/com/example/private/app.jar', 'delete')).toBe(true)
    expect(hasPermission(permissions, '/com/example/private/app.jar', 'write')).toBe(false)
  })

  it('matches root permission for any subpath when no longer prefix exists', () => {
    const withRoot: AccessPermission[] = [{ path: '/', actions: ['read'] as const }]
    expect(hasPermission(withRoot, '/any/path/at/all', 'read')).toBe(true)
    expect(hasPermission(withRoot, '/com/deeply/nested', 'read')).toBe(true)
    expect(hasPermission(withRoot, '/single-segment', 'read')).toBe(true)
  })

  it('matches root permission for write action', () => {
    const withRootWrite: AccessPermission[] = [{ path: '/', actions: ['read', 'write'] as const }]
    expect(hasPermission(withRootWrite, '/any/path', 'write')).toBe(true)
  })

  it('prefers longer prefix over root permission', () => {
    expect(hasPermission(permissions, '/com/example/private/app.jar', 'write')).toBe(false)
    expect(hasPermission(permissions, '/com/example/private/app.jar', 'delete')).toBe(true)
  })

  it('matches root path / itself with root permission', () => {
    const withRoot: AccessPermission[] = [{ path: '/', actions: ['read'] as const }]
    expect(hasPermission(withRoot, '/', 'read')).toBe(true)
    expect(hasPermission(withRoot, '/', 'write')).toBe(false)
  })

  it('matches root path / itself when no root permission exists', () => {
    const noRoot: AccessPermission[] = [{ path: '/com/example', actions: ['read'] as const }]
    expect(hasPermission(noRoot, '/', 'read')).toBe(false)
  })

  it('matches root permission with trailing slash in permission path', () => {
    const withTrailingSlash: AccessPermission[] = [{ path: '/', actions: ['read'] as const }]
    expect(hasPermission(withTrailingSlash, '/com/example', 'read')).toBe(true)
  })

  it('rejects write on a read-only root permission', () => {
    const rootReadOnly: AccessPermission[] = [{ path: '/', actions: ['read'] as const }]
    expect(hasPermission(rootReadOnly, '/com/example/app.jar', 'write')).toBe(false)
  })

  it('rejects delete when no permission grants it', () => {
    const noDelete: AccessPermission[] = [{ path: '/', actions: ['read', 'write'] as const }]
    expect(hasPermission(noDelete, '/com/example', 'delete')).toBe(false)
  })

  it('does not match partial path segments', () => {
    expect(hasPermission(permissions, '/com/example-tools/app.jar', 'write')).toBe(false)
  })

  it('treats manage as a global token capability', () => {
    expect(hasPermission(permissions, '/any/path', 'manage')).toBe(true)
    expect(hasPermission([{ path: '/', actions: ['read'] as const }], '/any/path', 'manage')).toBe(false)
  })

  it('works with paths without leading slash', () => {
    const withRoot: AccessPermission[] = [{ path: '/', actions: ['read'] as const }]
    expect(hasPermission(withRoot, 'com/example', 'read')).toBe(true)
  })

  it('checks exact action match on matched permission', () => {
    const mixed: AccessPermission[] = [
      { path: '/releases', actions: ['read'] as const },
      { path: '/releases/upload', actions: ['write'] as const },
    ]
    expect(hasPermission(mixed, '/releases/app.jar', 'read')).toBe(true)
    expect(hasPermission(mixed, '/releases/app.jar', 'write')).toBe(false)
    expect(hasPermission(mixed, '/releases/upload/app.jar', 'write')).toBe(true)
    expect(hasPermission(mixed, '/releases/upload/app.jar', 'read')).toBe(false)
  })
})
