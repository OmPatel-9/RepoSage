import { sql } from 'drizzle-orm'

import { db } from '../../db'
import { embedOne } from '../../worker/embeddings'

export interface SearchedChunk {
  id: string
  filePath: string
  language: string
  symbolName: string | null
  startLine: number
  endLine: number
  content: string
  tokenCount: number
  similarity: number
}

interface ChunkRow {
  id: string
  file_path: string
  language: string
  symbol_name: string | null
  start_line: number
  end_line: number
  content: string
  token_count: number
  similarity: number
}

function toVectorLiteral(vector: Float32Array): string {
  return `[${Array.from(vector).join(',')}]`
}

/**
 * Embeds the query and returns the k nearest chunks in a repo by cosine
 * distance, with a similarity score (1 - distance, higher is closer).
 */
export async function searchChunks(
  repoId: string,
  query: string,
  k = 20,
): Promise<SearchedChunk[]> {
  const vector = toVectorLiteral(await embedOne(query))

  const result = await db.execute(sql`
    SELECT
      id, file_path, language, symbol_name,
      start_line, end_line, content, token_count,
      1 - (embedding <=> ${vector}::vector) AS similarity
    FROM chunks
    WHERE repo_id = ${repoId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${k}
  `)

  const rows = result as unknown as ChunkRow[]
  return rows.map((row) => ({
    id: row.id,
    filePath: row.file_path,
    language: row.language,
    symbolName: row.symbol_name,
    startLine: row.start_line,
    endLine: row.end_line,
    content: row.content,
    tokenCount: row.token_count,
    similarity: Number(row.similarity),
  }))
}
