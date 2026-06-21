import { describe, expect, it } from 'vitest'

import { assembleContext } from './context'
import type { SearchedChunk } from './search'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeChunk(
  overrides: Partial<SearchedChunk> & { id: string },
): SearchedChunk {
  return {
    id: overrides.id,
    filePath: overrides.filePath ?? `src/file-${overrides.id}.ts`,
    language: overrides.language ?? 'typescript',
    symbolName: overrides.symbolName ?? null,
    startLine: overrides.startLine ?? 1,
    endLine: overrides.endLine ?? 10,
    content: overrides.content ?? `// content for chunk ${overrides.id}`,
    tokenCount: overrides.tokenCount ?? 10,
    similarity: overrides.similarity ?? 0.9,
  }
}

/** Returns a chunk whose raw block exceeds `tokens` tokens (~4 chars/token). */
function bigChunk(id: string, tokens: number): SearchedChunk {
  return makeChunk({ id, content: 'x'.repeat(tokens * 4) })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('assembleContext', () => {
  it('returns empty strings for an empty chunk list', () => {
    const { contextString, citationsIncluded } = assembleContext([])
    expect(contextString).toBe('')
    expect(citationsIncluded).toHaveLength(0)
  })

  it('includes a single small chunk within budget', () => {
    const chunk = makeChunk({ id: 'c1', content: 'export const x = 1' })
    const { contextString, citationsIncluded } = assembleContext([chunk], 3000)

    expect(contextString).toContain('export const x = 1')
    expect(citationsIncluded).toHaveLength(1)
    expect(citationsIncluded[0]!.chunkId).toBe('c1')
  })

  it('formats the header correctly', () => {
    const chunk = makeChunk({
      id: 'c1',
      filePath: 'src/index.ts',
      startLine: 5,
      endLine: 20,
      symbolName: 'myFn',
      content: 'code',
    })
    const { contextString } = assembleContext([chunk], 3000)

    expect(contextString).toContain('--- src/index.ts:5-20 (myFn) ---')
  })

  it('uses "block" as symbol name when symbolName is null', () => {
    const chunk = makeChunk({ id: 'c1', symbolName: null, content: 'code' })
    const { contextString } = assembleContext([chunk], 3000)

    expect(contextString).toContain('(block)')
  })

  it('stops adding chunks when budget is exceeded', () => {
    // Three chunks, each costing ~800 tokens. Budget 2000 → fits 2.
    const chunks = [
      bigChunk('c1', 800),
      bigChunk('c2', 800),
      bigChunk('c3', 800),
    ]
    const { citationsIncluded } = assembleContext(chunks, 2000)

    expect(citationsIncluded.length).toBeLessThanOrEqual(2)
    expect(citationsIncluded.some((c) => c.chunkId === 'c1')).toBe(true)
    expect(citationsIncluded.some((c) => c.chunkId === 'c2')).toBe(true)
    expect(citationsIncluded.some((c) => c.chunkId === 'c3')).toBe(false)
  })

  it('always includes at least one chunk even if it exceeds budget', () => {
    const chunk = bigChunk('c1', 5000) // way over 3000-token budget
    const { contextString, citationsIncluded } = assembleContext([chunk], 3000)

    expect(contextString.length).toBeGreaterThan(0)
    expect(citationsIncluded).toHaveLength(1)
    expect(citationsIncluded[0]!.chunkId).toBe('c1')
  })

  it('truncates an oversized first chunk to fit the token budget', () => {
    const maxTokens = 100
    const chunk = bigChunk('c1', 5000)
    const { contextString } = assembleContext([chunk], maxTokens)

    // Header + content should not exceed budget*4 chars by more than the header length
    const headerOverhead = 200 // generous upper bound for header characters
    expect(contextString.length).toBeLessThan(maxTokens * 4 + headerOverhead)
  })

  it('returns citations in the order chunks were consumed', () => {
    const chunks = [
      makeChunk({ id: 'a', content: 'short' }),
      makeChunk({ id: 'b', content: 'short' }),
      makeChunk({ id: 'c', content: 'short' }),
    ]
    const { citationsIncluded } = assembleContext(chunks, 3000)
    const ids = citationsIncluded.map((c) => c.chunkId)

    expect(ids).toEqual(['a', 'b', 'c'])
  })

  it('sets filePath, startLine, endLine correctly on citations', () => {
    const chunk = makeChunk({
      id: 'c1',
      filePath: 'lib/core.ts',
      startLine: 42,
      endLine: 99,
    })
    const { citationsIncluded } = assembleContext([chunk], 3000)

    expect(citationsIncluded[0]).toMatchObject({
      filePath: 'lib/core.ts',
      startLine: 42,
      endLine: 99,
      chunkId: 'c1',
    })
  })

  it('respects a very tight budget of 1 token (still includes truncated first chunk)', () => {
    const chunk = makeChunk({ id: 'c1', content: 'x'.repeat(1000) })
    const { citationsIncluded } = assembleContext([chunk], 1)

    expect(citationsIncluded).toHaveLength(1)
  })
})
