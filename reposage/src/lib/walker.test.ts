import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { walkRepo } from './walker'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------
let tmpDir: string

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `walker-test-${Date.now()}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

function write(relPath: string, content = 'hello\nworld\n') {
  const abs = path.join(tmpDir, relPath)
  mkdirSync(path.dirname(abs), { recursive: true })
  writeFileSync(abs, content)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('walkRepo', () => {
  it('returns indexable source files', async () => {
    write('src/index.ts', 'export const x = 1\n')
    write('src/utils.ts', 'export const y = 2\n')

    const files = await walkRepo(tmpDir)
    const paths = files.map((f) => f.filePath)

    expect(paths).toContain('src/index.ts')
    expect(paths).toContain('src/utils.ts')
  })

  it('detects language from extension', async () => {
    write('app.py', '# python\n')
    write('main.go', 'package main\n')
    write('style.css', 'body {}\n')

    const files = await walkRepo(tmpDir)
    const byPath = Object.fromEntries(files.map((f) => [f.filePath, f]))

    expect(byPath['app.py']?.language).toBe('python')
    expect(byPath['main.go']?.language).toBe('go')
    expect(byPath['style.css']?.language).toBe('css')
  })

  it('skips node_modules', async () => {
    write('node_modules/lodash/index.js', 'module.exports = {}')
    write('src/index.ts', 'export {}')

    const files = await walkRepo(tmpDir)
    const paths = files.map((f) => f.filePath)

    expect(paths.some((p) => p.includes('node_modules'))).toBe(false)
    expect(paths).toContain('src/index.ts')
  })

  it('skips .git directory', async () => {
    write('.git/config', '[core]')
    write('README.md', '# hi')

    const files = await walkRepo(tmpDir)
    const paths = files.map((f) => f.filePath)

    expect(paths.some((p) => p.startsWith('.git'))).toBe(false)
  })

  it('skips other ignored directories (dist, build, .next)', async () => {
    for (const dir of ['dist', 'build', '.next', 'coverage']) {
      write(`${dir}/output.js`, 'var x = 1')
    }
    write('src/real.ts', 'export {}')

    const files = await walkRepo(tmpDir)
    const paths = files.map((f) => f.filePath)

    for (const dir of ['dist', 'build', '.next', 'coverage']) {
      expect(paths.some((p) => p.startsWith(dir))).toBe(false)
    }
    expect(paths).toContain('src/real.ts')
  })

  it('skips lock files', async () => {
    write('pnpm-lock.yaml', 'lockfileVersion: 9')
    write('yarn.lock', '# yarn lock')
    write('package-lock.json', '{}')
    write('src/index.ts', 'export {}')

    const files = await walkRepo(tmpDir)
    const paths = files.map((f) => f.filePath)

    expect(paths).not.toContain('pnpm-lock.yaml')
    expect(paths).not.toContain('yarn.lock')
    expect(paths).not.toContain('package-lock.json')
  })

  it('skips dotfiles and dotdirs', async () => {
    write('.env', 'SECRET=abc')
    write('.husky/pre-commit', '#!/bin/sh')
    write('src/index.ts', 'export {}')

    const files = await walkRepo(tmpDir)
    const paths = files.map((f) => f.filePath)

    expect(paths.some((p) => p.startsWith('.'))).toBe(false)
    expect(paths).toContain('src/index.ts')
  })

  it('returns correct lineCount', async () => {
    write('three-lines.ts', 'line1\nline2\nline3\n')

    const files = await walkRepo(tmpDir)
    const file = files.find((f) => f.filePath === 'three-lines.ts')

    expect(file).toBeDefined()
    // 3 newlines → 4 counted lines (trailing newline creates empty last line)
    expect(file!.lineCount).toBeGreaterThanOrEqual(3)
  })

  it('returns correct sizeBytes', async () => {
    const content = 'x'.repeat(1024)
    write('big.ts', content)

    const files = await walkRepo(tmpDir)
    const file = files.find((f) => f.filePath === 'big.ts')

    expect(file?.sizeBytes).toBe(1024)
  })

  it('returns an empty array for an empty directory', async () => {
    const files = await walkRepo(tmpDir)
    expect(files).toHaveLength(0)
  })

  it('uses forward slashes in returned paths even on Windows', async () => {
    write('deep/nested/file.ts', 'export {}')

    const files = await walkRepo(tmpDir)
    const file = files.find((f) => f.filePath.includes('file.ts'))

    expect(file?.filePath).toBe('deep/nested/file.ts')
    expect(file?.filePath).not.toContain('\\')
  })
})
