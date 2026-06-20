import { and, asc, eq, gte, lte } from 'drizzle-orm'

import { db } from '@/db'
import { chunks, repos } from '@/db/schema'
import { getCurrentUser, UnauthorizedError } from '@/lib/auth'

export interface SnippetResponse {
  filePath: string
  language: string
  startLine: number
  endLine: number
  content: string
  citedStart: number
  citedEnd: number
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await getCurrentUser()
    const { id } = await context.params
    const params = new URL(req.url).searchParams
    const filePath = params.get('path')
    const citedStart = Number(params.get('start'))
    const citedEnd = Number(params.get('end'))

    if (
      !filePath ||
      !Number.isFinite(citedStart) ||
      !Number.isFinite(citedEnd)
    ) {
      return Response.json({ error: 'Invalid range.' }, { status: 400 })
    }

    const repo = await db.query.repos.findFirst({
      where: and(eq(repos.id, id), eq(repos.userId, user.id)),
    })
    if (!repo) {
      return Response.json({ error: 'Repo not found.' }, { status: 404 })
    }

    // Find the chunk that best covers the cited range.
    const candidate = await db.query.chunks.findFirst({
      where: and(
        eq(chunks.repoId, id),
        eq(chunks.filePath, filePath),
        lte(chunks.startLine, citedEnd),
        gte(chunks.endLine, citedStart),
      ),
      orderBy: asc(chunks.startLine),
    })

    if (!candidate) {
      return Response.json({ error: 'Snippet not found.' }, { status: 404 })
    }

    const body: SnippetResponse = {
      filePath: candidate.filePath,
      language: candidate.language,
      startLine: candidate.startLine,
      endLine: candidate.endLine,
      content: candidate.content,
      citedStart,
      citedEnd,
    }
    return Response.json(body)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    console.error('snippet route failed:', error)
    return Response.json({ error: 'Could not load snippet.' }, { status: 500 })
  }
}
