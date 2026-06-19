import type { RawChunk } from './tree-sitter'

/** Window-based fallback chunker: 300-line windows with 50-line overlap. */
export function chunkByLines(content: string): RawChunk[] {
  const lines = content.split('\n')
  if (lines.length === 0) return []

  const windowSize = 300
  const overlap = 50
  const out: RawChunk[] = []

  let start = 1 // 1-based
  while (start <= lines.length) {
    const end = Math.min(start + windowSize - 1, lines.length)
    out.push({
      symbolName: null,
      startLine: start,
      endLine: end,
      content: lines.slice(start - 1, end).join('\n'),
    })
    if (end >= lines.length) break
    start = end - overlap + 1
  }
  return out
}
