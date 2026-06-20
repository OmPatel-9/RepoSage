import type { Citation } from '../../db/schema'
import type { SearchedChunk } from './search'

export interface AssembledContext {
  contextString: string
  citationsIncluded: Citation[]
}

/** ~4 characters per token. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Concatenates the top chunks into a context block until the token budget is
 * reached. Each block is labelled with its file path, line range, and symbol
 * so the model can cite precisely. Returns the citations actually included.
 */
export function assembleContext(
  chunks: SearchedChunk[],
  maxTokens = 3000,
): AssembledContext {
  const parts: string[] = []
  const citationsIncluded: Citation[] = []
  let budget = maxTokens

  for (const chunk of chunks) {
    const header = `--- ${chunk.filePath}:${chunk.startLine}-${chunk.endLine} (${chunk.symbolName ?? 'block'}) ---`
    const block = `${header}\n${chunk.content}\n`
    const cost = estimateTokens(block)

    if (cost > budget) {
      // Stop once the next chunk would overflow the budget.
      if (parts.length === 0) {
        // Always include at least one chunk, truncated to fit.
        const maxChars = budget * 4
        parts.push(`${header}\n${chunk.content.slice(0, maxChars)}\n`)
        citationsIncluded.push({
          filePath: chunk.filePath,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          chunkId: chunk.id,
        })
      }
      break
    }

    parts.push(block)
    citationsIncluded.push({
      filePath: chunk.filePath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      chunkId: chunk.id,
    })
    budget -= cost
  }

  return { contextString: parts.join('\n'), citationsIncluded }
}
