import { enqueueIndexRepo } from '@/lib/queue/client'
import { getCurrentUser, UnauthorizedError } from '@/lib/auth'

export async function POST(): Promise<Response> {
  try {
    await getCurrentUser()

    // Placeholder payload — a fake repo id to exercise the pipeline.
    const repoId = `test-${Date.now()}`
    const jobId = await enqueueIndexRepo({ repoId })

    return Response.json({ jobId, repoId })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    console.error('test-queue route failed:', error)
    return Response.json({ error: 'Could not enqueue job.' }, { status: 500 })
  }
}
