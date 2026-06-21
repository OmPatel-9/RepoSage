'use server'

import { and, eq } from 'drizzle-orm'

import { db } from '../../db'
import { repos } from '../../db/schema'
import { capture } from '../analytics'
import { enqueueGenerateDoc } from '../queue/client'
import { RateLimitError, enforceRateLimit } from '../rate-limit'
import { getCurrentUser, UnauthorizedError } from '../auth'

export interface GenerateDocState {
  ok: boolean
  jobId?: string
  status?: number
  error?: string
}

/** Enqueues onboarding-doc generation for a repo the user owns. */
export async function generateDocAction(
  repoId: string,
): Promise<GenerateDocState> {
  let userId: string
  try {
    const user = await getCurrentUser()
    userId = user.id
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, status: 401, error: 'Sign in required.' }
    }
    throw error
  }

  const repo = await db.query.repos.findFirst({
    where: and(eq(repos.id, repoId), eq(repos.userId, userId)),
  })
  if (!repo) {
    return { ok: false, status: 404, error: 'Repo not found.' }
  }
  if (repo.status !== 'ready') {
    return { ok: false, status: 409, error: 'Repo is not indexed yet.' }
  }

  try {
    await enforceRateLimit(userId, 'doc')
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, status: 429, error: error.message }
    }
    throw error
  }

  const jobId = await enqueueGenerateDoc({ repoId })
  capture(userId, {
    event: 'doc_generated',
    properties: {
      repoId,
      userId,
      model: 'queued',
      latencyMs: 0,
      success: true,
    },
  })
  return { ok: true, jobId }
}
