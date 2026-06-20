import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { generatedDocs, repos } from '@/db/schema'
import { getCurrentUser, UnauthorizedError } from '@/lib/auth'

export interface DocResponse {
  markdown: string
  modelUsed: string
  generatedAt: string
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await getCurrentUser()
    const { id } = await context.params

    const repo = await db.query.repos.findFirst({
      where: and(eq(repos.id, id), eq(repos.userId, user.id)),
    })
    if (!repo) {
      return Response.json({ error: 'Repo not found.' }, { status: 404 })
    }

    const doc = await db.query.generatedDocs.findFirst({
      where: eq(generatedDocs.repoId, id),
      orderBy: desc(generatedDocs.generatedAt),
    })
    if (!doc) {
      return Response.json({ doc: null })
    }

    const body: DocResponse = {
      markdown: doc.markdown,
      modelUsed: doc.modelUsed,
      generatedAt: doc.generatedAt.toISOString(),
    }
    return Response.json({ doc: body })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    console.error('doc route failed:', error)
    return Response.json({ error: 'Could not load doc.' }, { status: 500 })
  }
}
