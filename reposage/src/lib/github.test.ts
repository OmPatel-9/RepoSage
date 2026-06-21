import { describe, expect, it } from 'vitest'

import { parseGithubUrl } from './github'

describe('parseGithubUrl', () => {
  // ── Valid inputs ──────────────────────────────────────────────────────────

  it('parses a full https URL', () => {
    expect(parseGithubUrl('https://github.com/sindresorhus/is')).toEqual({
      owner: 'sindresorhus',
      name: 'is',
    })
  })

  it('strips a trailing .git suffix', () => {
    expect(parseGithubUrl('https://github.com/vercel/next.js.git')).toEqual({
      owner: 'vercel',
      name: 'next.js',
    })
  })

  it('strips a trailing slash', () => {
    expect(parseGithubUrl('https://github.com/facebook/react/')).toEqual({
      owner: 'facebook',
      name: 'react',
    })
  })

  it('parses an http URL (not just https)', () => {
    expect(parseGithubUrl('http://github.com/owner/repo')).toEqual({
      owner: 'owner',
      name: 'repo',
    })
  })

  it('parses the owner/name shorthand', () => {
    expect(parseGithubUrl('pallets/flask')).toEqual({
      owner: 'pallets',
      name: 'flask',
    })
  })

  it('parses a bare github.com/owner/name URL without scheme', () => {
    expect(parseGithubUrl('github.com/colinhacks/zod')).toEqual({
      owner: 'colinhacks',
      name: 'zod',
    })
  })

  it('parses a git@ SSH URL', () => {
    expect(parseGithubUrl('git@github.com:owner/repo.git')).toEqual({
      owner: 'owner',
      name: 'repo',
    })
  })

  it('accepts repo names with dots (e.g. next.js)', () => {
    expect(parseGithubUrl('vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js',
    })
  })

  it('accepts repo names with hyphens and underscores', () => {
    expect(parseGithubUrl('my-org/my_repo')).toEqual({
      owner: 'my-org',
      name: 'my_repo',
    })
  })

  // ── Invalid inputs ────────────────────────────────────────────────────────

  it('returns null for an empty string', () => {
    expect(parseGithubUrl('')).toBeNull()
  })

  it('returns null for whitespace only', () => {
    expect(parseGithubUrl('   ')).toBeNull()
  })

  it('returns null for a non-GitHub URL', () => {
    expect(parseGithubUrl('https://gitlab.com/owner/repo')).toBeNull()
  })

  it('returns null for a URL with no repo segment', () => {
    expect(parseGithubUrl('https://github.com/owner')).toBeNull()
  })

  it('returns null for too many path segments in shorthand', () => {
    expect(parseGithubUrl('owner/repo/extra')).toBeNull()
  })

  it('returns null for an invalid owner name (starts with hyphen)', () => {
    expect(parseGithubUrl('-badowner/repo')).toBeNull()
  })

  it('returns null for a malformed URL', () => {
    expect(parseGithubUrl('https://not a url')).toBeNull()
  })

  it('trims leading/trailing whitespace before parsing', () => {
    expect(parseGithubUrl('  https://github.com/owner/repo  ')).toEqual({
      owner: 'owner',
      name: 'repo',
    })
  })
})
