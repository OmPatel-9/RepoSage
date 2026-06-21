import { describe, expect, it } from 'vitest'

import { chunkByLines } from './lines'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeLines(n: number): string {
  return Array.from({ length: n }, (_, i) => `line${i + 1}`).join('\n')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('chunkByLines', () => {
  it('returns a single empty chunk for empty content', () => {
    // ''.split('\n') → [''] (length 1), so the chunker produces one chunk.
    const chunks = chunkByLines('')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.content).toBe('')
  })

  it('returns a single chunk for content under the window size', () => {
    const content = makeLines(10)
    const chunks = chunkByLines(content)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.startLine).toBe(1)
    expect(chunks[0]!.endLine).toBe(10)
    expect(chunks[0]!.symbolName).toBeNull()
  })

  it('returns a single chunk for content exactly at the window size (300 lines)', () => {
    const content = makeLines(300)
    const chunks = chunkByLines(content)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.startLine).toBe(1)
    expect(chunks[0]!.endLine).toBe(300)
  })

  it('produces two chunks for content slightly over the window (301 lines)', () => {
    const content = makeLines(301)
    const chunks = chunkByLines(content)

    // First window: 1-300; second window starts at 300 - 50 + 1 = 251
    expect(chunks).toHaveLength(2)
    expect(chunks[0]!.startLine).toBe(1)
    expect(chunks[0]!.endLine).toBe(300)
    expect(chunks[1]!.startLine).toBe(251)
    expect(chunks[1]!.endLine).toBe(301)
  })

  it('overlaps adjacent chunks by 50 lines', () => {
    const content = makeLines(400)
    const chunks = chunkByLines(content)

    // chunk[0]: 1-300, chunk[1]: 251-400
    // Overlap = chunk[0].endLine - chunk[1].startLine + 1 = 300 - 251 + 1 = 50
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    const overlap = chunks[0]!.endLine - chunks[1]!.startLine + 1
    expect(overlap).toBe(50)
  })

  it('chunk content matches the correct lines', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `L${i + 1}`)
    const content = lines.join('\n')
    const chunks = chunkByLines(content)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.content).toBe(content)
  })

  it('last chunk ends exactly at the last line', () => {
    const content = makeLines(550)
    const chunks = chunkByLines(content)

    const last = chunks.at(-1)!
    expect(last.endLine).toBe(550)
  })

  it('all chunks have startLine >= 1', () => {
    const content = makeLines(700)
    const chunks = chunkByLines(content)

    for (const chunk of chunks) {
      expect(chunk.startLine).toBeGreaterThanOrEqual(1)
    }
  })

  it('all chunks have endLine >= startLine', () => {
    const content = makeLines(700)
    const chunks = chunkByLines(content)

    for (const chunk of chunks) {
      expect(chunk.endLine).toBeGreaterThanOrEqual(chunk.startLine)
    }
  })

  it('chunks cover every line at least once (no gaps)', () => {
    const totalLines = 650
    const content = makeLines(totalLines)
    const chunks = chunkByLines(content)

    // Build a coverage set
    const covered = new Set<number>()
    for (const chunk of chunks) {
      for (let i = chunk.startLine; i <= chunk.endLine; i++) {
        covered.add(i)
      }
    }

    for (let i = 1; i <= totalLines; i++) {
      expect(covered.has(i), `line ${i} not covered`).toBe(true)
    }
  })

  it('handles a single-line file', () => {
    const chunks = chunkByLines('only one line')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.startLine).toBe(1)
    expect(chunks[0]!.endLine).toBe(1)
    expect(chunks[0]!.content).toBe('only one line')
  })
})
