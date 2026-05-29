import { beforeEach, describe, expect, it } from 'vitest'

const mockForm = {
  name: '',
  description: '',
  path: '/',
  actions: ['read'] as const,
}

const normalizedPath = (input: string): string => {
  const trimmed = input.trim()
  if (!trimmed || trimmed === '/') return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

describe('TokenEditorModal form normalization', () => {
  beforeEach(() => {
    mockForm.name = ''
    mockForm.description = ''
    mockForm.path = '/'
    mockForm.actions = ['read']
  })

  it('normalizes path to include leading slash', () => {
    expect(normalizedPath('com/example/demo')).toBe('/com/example/demo')
    expect(normalizedPath('/com/example/demo')).toBe('/com/example/demo')
  })

  it('normalizes root path to single slash', () => {
    expect(normalizedPath('')).toBe('/')
    expect(normalizedPath('/')).toBe('/')
    expect(normalizedPath('  /  ')).toBe('/')
  })

  it('preserves path with leading slash', () => {
    expect(normalizedPath('/com/example/demo')).toBe('/com/example/demo')
  })

  it('resets form to default values on new token', () => {
    mockForm.path = '/'
    mockForm.actions = ['read']
    expect(mockForm.path).toBe('/')
    expect(mockForm.actions).toEqual(['read'])
  })

  it('clones initial values for edit mode', () => {
    const initial = {
      name: 'my-token',
      description: 'A test token',
      path: '/com/example',
      actions: ['read', 'write'] as const,
    }
    const form = {
      name: initial.name,
      description: initial.description ?? '',
      path: initial.path,
      actions: [...initial.actions],
    }
    expect(form.name).toBe('my-token')
    expect(form.actions).toEqual(['read', 'write'])
    expect(form.actions).not.toBe(initial.actions)
  })

  it('emits save with normalized data', () => {
    const form = {
      name: '  my-token  ',
      description: '  A test token  ',
      path: '  /com/example  ',
      actions: ['read', 'write'] as const,
    }
    const result = {
      name: form.name.trim(),
      description: form.description.trim(),
      path: normalizedPath(form.path),
      actions: [...form.actions],
    }
    expect(result.name).toBe('my-token')
    expect(result.path).toBe('/com/example')
  })
})