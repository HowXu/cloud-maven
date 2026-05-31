import { describe, expect, it } from 'vitest'

import { AppError, getParentPath, getPathName, normalizeMavenPath, normalizePermissionPath } from '../../src/shared'

describe('Maven path normalization', () => {
  it('normalizes leading and trailing slashes', () => {
    expect(normalizeMavenPath('/com/example/demo/')).toEqual({
      value: 'com/example/demo',
      segments: ['com', 'example', 'demo'],
      isRoot: false,
    })
  })

  it('allows root only when explicitly requested', () => {
    expect(normalizeMavenPath('', { allowRoot: true })).toEqual({
      value: '',
      segments: [],
      isRoot: true,
    })
    expect(() => normalizeMavenPath('')).toThrow(AppError)
  })

  it('rejects unsafe paths before they reach R2', () => {
    const invalidPaths = [
      'com/example/../demo',
      'com/example/demo..bak',
      'com//example',
      'com\\example',
      ' com/example',
      'com/example ',
      'com/<script>/demo',
      'api/admin/settings',
    ]

    for (const path of invalidPaths) {
      expect(() => normalizeMavenPath(path)).toThrow(AppError)
    }
  })

  it('rejects control characters in paths', () => {
    const controlPaths = [
      '\x00hidden',
      'com/\x01/example',
      'com\x7F/example',
    ]

    for (const path of controlPaths) {
      expect(() => normalizeMavenPath(path)).toThrow(AppError)
    }
  })

  it('rejects HTML meta-characters in paths', () => {
    expect(() => normalizeMavenPath('<script>')).toThrow(AppError)
    expect(() => normalizeMavenPath('com/example">')).toThrow(AppError)
    expect(() => normalizeMavenPath("com/example'")).toThrow(AppError)
  })

  it('rejects paths with backslashes (Windows directory separator)', () => {
    expect(() => normalizeMavenPath('com\\example\\demo')).toThrow(AppError)
  })

  it('rejects repeated slashes anywhere in path', () => {
    expect(() => normalizeMavenPath('com//example')).toThrow(AppError)
    expect(() => normalizeMavenPath('//com/example')).toThrow(AppError)
  })

  it('rejects paths containing single dot segment', () => {
    expect(() => normalizeMavenPath('com/./example')).toThrow(AppError)
  })

  it('rejects empty string when root is not allowed', () => {
    expect(() => normalizeMavenPath('')).toThrow(AppError)
  })

  it('normalizes permission paths and permits reserved API paths for policy data', () => {
    expect(normalizePermissionPath('/')).toBe('/')
    expect(normalizePermissionPath('/com/example/')).toBe('/com/example')
    expect(normalizePermissionPath('/api/admin')).toBe('/api/admin')
  })

  it('normalizes root permission path correctly', () => {
    expect(normalizePermissionPath('')).toBe('/')
    expect(normalizePermissionPath('/')).toBe('/')
  })

  it('extracts parent paths and path names', () => {
    expect(getParentPath('com/example/demo')).toBe('com/example')
    expect(getParentPath('com')).toBeNull()
    expect(getPathName('com/example/demo')).toBe('demo')
    expect(getPathName('/')).toBe('')
  })
})
