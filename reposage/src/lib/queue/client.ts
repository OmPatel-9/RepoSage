import { Queue } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import { Redis } from 'ioredis'

import { env } from '../../env'

import type {
  GenerateDocJob,
  IndexRepoJob,
  RepoSageJob,
  RepoSageJobName,
} from './types'
import { QUEUE_NAME } from './types'

const globalForQueue = globalThis as unknown as {
  queueConnection?: Redis
  indexingQueue?: Queue<RepoSageJob['data'], unknown, RepoSageJobName>
}

export function getQueueConnection(): Redis {
  globalForQueue.queueConnection ??= new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    // Required for serverless (Vercel): skip the ready check so the first
    // command doesn't time out waiting for a "ready" event that never fires.
    enableReadyCheck: false,
    // Don't throw on initial connect failure — let BullMQ retry.
    lazyConnect: true,
  })
  return globalForQueue.queueConnection
}

export const indexingQueue: Queue<
  RepoSageJob['data'],
  unknown,
  RepoSageJobName
> = (globalForQueue.indexingQueue ??= new Queue(QUEUE_NAME, {
  connection: getQueueConnection() as unknown as ConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
  },
}))

/** Enqueue a repository indexing job. Returns the BullMQ job id. */
export async function enqueueIndexRepo(
  data: IndexRepoJob['data'],
): Promise<string> {
  const job = await indexingQueue.add('index-repo', data, {
    jobId: `index-repo__${data.repoId}`,
  })
  return job.id as string
}

/**
 * Enqueue a documentation generation job. Returns the BullMQ job id.
 * Uses an auto-generated job id (not keyed by repoId) so that "Regenerate"
 * always starts a fresh run instead of colliding with a previous job.
 */
export async function enqueueGenerateDoc(
  data: GenerateDocJob['data'],
): Promise<string> {
  const job = await indexingQueue.add('generate-doc', data)
  return job.id as string
}
