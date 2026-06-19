import { chunkByLines } from './lines'
import { chunkWithAst, isAstLanguage, type RawChunk } from './tree-sitter'

export type { RawChunk } from './tree-sitter'

export interface FileChunk extends RawChunk {
  filePath: string
  language: string
  tokenCount: number
}

/** Rough token estimate: ~4 characters per token. */
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

/**
 * Chunks a single file. Uses the AST chunker for supported languages and
 * falls back to line windows otherwise (or if parsing fails). Skips files
 * that are empty or whitespace-only.
 */
export async function chunkFile(
  filePath: string,
  content: string,
  language: string,
): Promise<FileChunk[]> {
  if (content.trim().length === 0) return []

  let raw: RawChunk[]
  if (isAstLanguage(language)) {
    try {
      raw = await chunkWithAst(filePath, content, language)
    } catch {
      // Grammar failed to load or parse — degrade gracefully.
      raw = chunkByLines(content)
    }
  } else {
    raw = chunkByLines(content)
  }

  return raw
    .filter((chunk) => chunk.content.trim().length > 0)
    .map((chunk) => ({
      ...chunk,
      filePath,
      language,
      tokenCount: estimateTokens(chunk.content),
    }))
}
