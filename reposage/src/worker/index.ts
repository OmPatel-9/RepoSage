import '../env-load'

import { createServer } from 'node:http'

import { Worker } from 'bullmq'
import type { ConnectionOptions, Job } from 'bullmq'
import { Redis } from 'ioredis'

import { QUEUE_NAME } from '../lib/queue/types'
import type { RepoSageJob, RepoSageJobName } from '../lib/queue/types'
import { env } from '../env'

import { handleGenerateDoc } from './handlers/generate-doc'
import { handleIndexRepo } from './handlers/index-repo'
import { logger } from './logger'

const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 3001)
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 4)

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

async function processJob(
  job: Job<RepoSageJob['data'], unknown, RepoSageJobName>,
): Promise<unknown> {
  const log = logger.child({ jobId: job.id, jobName: job.name })
  const startedAt = Date.now()
  log.info('job started')

  try {
    let result: unknown
    switch (job.name) {
      case 'index-repo':
        result = await handleIndexRepo(job, log)
        break
      case 'generate-doc':
        result = await handleGenerateDoc(job, log)
        break
      default: {
        // Exhaustiveness check — adding a job to RepoSageJob without a handler
        // makes this fail to compile.
        const unreachable: never = job.name
        throw new Error(`No handler for job: ${String(unreachable)}`)
      }
    }
    log.info({ durationMs: Date.now() - startedAt }, 'job finished')
    return result
  } catch (error) {
    log.error({ durationMs: Date.now() - startedAt, err: error }, 'job failed')
    throw error
  }
}

const worker = new Worker<RepoSageJob['data'], unknown, RepoSageJobName>(
  QUEUE_NAME,
  processJob,
  // See client.ts: cast through BullMQ's connection type (dual-ioredis copies).
  {
    connection: connection as unknown as ConnectionOptions,
    concurrency: CONCURRENCY,
  },
)

worker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, jobName: job?.name, attempts: job?.attemptsMade, err },
    'worker: job moved to failed',
  )
})

worker.on('error', (err) => {
  logger.error({ err }, 'worker: internal error')
})

// Health server for production keepalive pings (e.g. Railway/Render).
const healthServer = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', running: worker.isRunning() }))
    return
  }
  res.writeHead(404)
  res.end()
})

healthServer.listen(HEALTH_PORT, () => {
  logger.info(
    { port: HEALTH_PORT, concurrency: CONCURRENCY },
    'worker ready; health endpoint listening',
  )
})

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, 'shutting down; finishing in-flight jobs')

  try {
    // worker.close() waits for active jobs to complete before resolving.
    await worker.close()
    await new Promise<void>((resolve) => healthServer.close(() => resolve()))
    await connection.quit()
    logger.info('shutdown complete')
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'error during shutdown')
    process.exit(1)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
