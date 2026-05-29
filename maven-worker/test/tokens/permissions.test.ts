import { describe, expect, it } from 'vitest'

import { hasPermission } from '../../src/tokens'
import type { AccessPermission } from '../../src/env'

describe('token permission matching', () => {
  const permissions: AccessPermission[] = [
    { path: '/', actions: ['read'] },
    { path: '/com/example', actions: ['read', 'write'] },
    { path: '/com/example/private', actions: ['read', 'delete'] },
    { path: '/admin', actions: ['manage'] },
  ]

  it('matches permissions by the longest path prefix', () => {
    expect(hasPermission(permissions, '/com/example/demo/app.jar', 'write')).toBe(true)
    expect(hasPermission(permissions, '/com/other/demo/app.jar', 'read')).toBe(true)
    expect(hasPermission(permissions, '/com/other/demo/app.jar', 'write')).toBe(false)
    expect(hasPermission(permissions, '/com/example/private/app.jar', 'delete')).toBe(true)
    expect(hasPermission(permissions, '/com/example/private/app.jar', 'write')).toBe(false)
  })

  it('does not match partial path segments', () => {
    expect(hasPermission(permissions, '/com/example-tools/app.jar', 'write')).toBe(false)
  })

  it('treats manage as a global token capability', () => {
    expect(hasPermission(permissions, '/any/path', 'manage')).toBe(true)
    expect(hasPermission([{ path: '/', actions: ['read'] }], '/any/path', 'manage')).toBe(false)
  })
})
