import { indexingQueue } from '@/lib/queue/client'
import { getCurrentUser, UnauthorizedError } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  _req: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    await getCurrentUser()
    const { id } = await context.params

    const job = await indexingQueue.getJob(id)
    if (!job) {
      return Response.json({ error: 'Job not found.' }, { status: 404 })
    }

    const state = await job.getState()

    return Response.json({
      id: job.id,
      name: job.name,
      state,
      progress: job.progress,
      returnValue: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
      attemptsMade: job.attemptsMade,
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    console.error('jobs/[id] route failed:', error)
    return Response.json(
      { error: 'Could not load job status.' },
      { status: 500 },
    )
  }
}
