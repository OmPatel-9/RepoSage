import type { Job } from 'bullmq'
import type { Logger } from 'pino'

import type { GenerateDocJob } from '../../lib/queue/types'

/**
 * Placeholder documentation generation handler.
 * Real implementation (retrieve → summarize → persist markdown) lands later.
 */
export async function handleGenerateDoc(
  job: Job<GenerateDocJob['data']>,
  log: Logger,
): Promise<{ repoId: string; generated: boolean }> {
  log.info({ repoId: job.data.repoId }, 'generate-doc: received payload')

  await job.updateProgress(100)

  log.info({ repoId: job.data.repoId }, 'generate-doc: done (placeholder)')
  return { repoId: job.data.repoId, generated: true }
}
