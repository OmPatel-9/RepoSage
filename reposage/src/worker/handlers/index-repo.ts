import type { Job } from 'bullmq'
import type { Logger } from 'pino'

import type { IndexRepoJob } from '../../lib/queue/types'

/**
 * Placeholder repository indexing handler.
 * Real implementation (clone → parse → embed → store) lands in a later step.
 */
export async function handleIndexRepo(
  job: Job<IndexRepoJob['data']>,
  log: Logger,
): Promise<{ repoId: string; indexed: boolean }> {
  log.info({ repoId: job.data.repoId }, 'index-repo: received payload')

  await job.updateProgress(100)

  log.info({ repoId: job.data.repoId }, 'index-repo: done (placeholder)')
  return { repoId: job.data.repoId, indexed: true }
}
