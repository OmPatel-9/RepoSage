import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { indexingJobs, repos } from '@/db/schema'
import { getCurrentUser, UnauthorizedError } from '@/lib/auth'

export interface RepoStatusResponse {
  id: string
  owner: string
  name: string
  status: string
  fileCount: number
  chunkCount: number
  sizeBytes: number
  progress: number
  currentStep: string
  error: string | null
}

const TERMINAL = new Set(['ready', 'failed'])

function fallbackProgress(status: string): number {
  switch (status) {
    case 'cloning':
      return 10
    case 'walking':
      return 30
    case 'ready':
      return 100
    default:
      return 0
  }
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

    const latestJob = await db.query.indexingJobs.findFirst({
      where: eq(indexingJobs.repoId, id),
      orderBy: desc(indexingJobs.startedAt),
    })

    const status = repo.status
    const progress = TERMINAL.has(status)
      ? status === 'ready'
        ? 100
        : (latestJob?.progress ?? fallbackProgress(status))
      : (latestJob?.progress ?? fallbackProgress(status))

    const body: RepoStatusResponse = {
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      status,
      fileCount: repo.fileCount,
      chunkCount: repo.chunkCount,
      sizeBytes: repo.sizeBytes,
      progress,
      currentStep: latestJob?.currentStep ?? 'Queued',
      error: repo.error,
    }
    return Response.json(body)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    console.error('repos/[id] route failed:', error)
    return Response.json(
      { error: 'Could not load repo status.' },
      { status: 500 },
    )
  }
}
