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

// Cache on globalThis so Next.js HMR doesn't open a new connection per reload.
const globalForQueue = globalThis as unknown as {
  queueConnection?: Redis
  indexingQueue?: Queue<RepoSageJob['data'], unknown, RepoSageJobName>
}

/**
 * Shared ioredis connection for the queue (producer side).
 * `maxRetriesPerRequest: null` is required by BullMQ.
 */
export function getQueueConnection(): Redis {
  globalForQueue.queueConnection ??= new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  })
  return globalForQueue.queueConnection
}

export const indexingQueue: Queue<
  RepoSageJob['data'],
  unknown,
  RepoSageJobName
> = (globalForQueue.indexingQueue ??= new Queue(QUEUE_NAME, {
  // BullMQ bundles its own ioredis copy, so an app-level Redis instance is
  // structurally identical but nominally distinct; cast through the shared type.
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

/** Enqueue a documentation generation job. Returns the BullMQ job id. */
export async function enqueueGenerateDoc(
  data: GenerateDocJob['data'],
): Promise<string> {
  const job = await indexingQueue.add('generate-doc', data, {
    jobId: `generate-doc__${data.repoId}`,
  })
  return job.id as string
}
