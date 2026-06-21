import { readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { Job } from 'bullmq'
import { eq } from 'drizzle-orm'
import type { Logger } from 'pino'
import { simpleGit } from 'simple-git'

import { db } from '../../db'
import { chunks, indexingJobs, repos } from '../../db/schema'
import { capture } from '../../lib/analytics'
import type { IndexRepoJob } from '../../lib/queue/types'
import { walkRepo } from '../../lib/walker'
import { chunkFile, type FileChunk } from '../chunker'
import { EMBED_BATCH_SIZE, embedBatch } from '../embeddings'

interface IndexRepoResult {
  repoId: string
  fileCount: number
  chunkCount: number
  sizeBytes: number
}

/** Chunk rows inserted per database transaction. */
const INSERT_BATCH = 50

type ChunkInsert = typeof chunks.$inferInsert

/**
 * Clones a repo, walks its files, splits them into symbol-level chunks,
 * embeds each chunk with bge-small, and stores them with pgvector embeddings.
 * Progress + current step are mirrored onto an indexing_jobs row for the UI.
 */
export async function handleIndexRepo(
  job: Job<IndexRepoJob['data']>,
  log: Logger,
): Promise<IndexRepoResult> {
  const { repoId } = job.data
  const clonePath = path.join(os.tmpdir(), 'reposage', repoId)
  const startedAt = Date.now()

  const [jobRow] = await db
    .insert(indexingJobs)
    .values({ repoId, status: 'cloning', progress: 0, currentStep: 'Queued' })
    .returning({ id: indexingJobs.id })

  const setStep = async (
    status: string,
    progress: number,
    currentStep: string,
  ): Promise<void> => {
    await job.updateProgress(progress)
    await db.update(repos).set({ status }).where(eq(repos.id, repoId))
    if (jobRow) {
      await db
        .update(indexingJobs)
        .set({ status, progress, currentStep })
        .where(eq(indexingJobs.id, jobRow.id))
    }
  }

  try {
    const repo = await db.query.repos.findFirst({ where: eq(repos.id, repoId) })
    if (!repo) throw new Error(`Repo ${repoId} not found`)

    capture(repo.userId, {
      event: 'repo_index_started',
      properties: { repoId, githubUrl: repo.githubUrl, userId: repo.userId },
    })

    // 1. Clone -------------------------------------------------------------
    log.info({ repoId, url: repo.githubUrl }, 'index-repo: cloning')
    await setStep('cloning', 10, 'Cloning repository')

    await rm(clonePath, { recursive: true, force: true })
    await simpleGit().clone(repo.githubUrl, clonePath, [
      '--depth',
      '1',
      '--single-branch',
    ])
    const commitSha = (await simpleGit(clonePath).revparse(['HEAD'])).trim()

    // 2. Walk --------------------------------------------------------------
    log.info({ repoId }, 'index-repo: walking files')
    await setStep('walking', 30, 'Walking files')
    const files = await walkRepo(clonePath)
    const sizeBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0)

    await db
      .update(repos)
      .set({
        fileCount: files.length,
        sizeBytes,
        commitSha,
        defaultBranch: repo.defaultBranch,
      })
      .where(eq(repos.id, repoId))

    // 3. Chunk -------------------------------------------------------------
    log.info({ repoId, fileCount: files.length }, 'index-repo: chunking')
    await setStep('chunking', 50, 'Chunking files')

    const allChunks: FileChunk[] = []
    for (const file of files) {
      let content: string
      try {
        content = (
          await readFile(path.join(clonePath, file.filePath))
        ).toString('utf-8')
      } catch {
        continue
      }
      const fileChunks = await chunkFile(file.filePath, content, file.language)
      allChunks.push(...fileChunks)
    }

    // 4. Embed + insert ----------------------------------------------------
    log.info({ repoId, chunkCount: allChunks.length }, 'index-repo: embedding')
    await setStep('embedding', 70, 'Embedding chunks')

    const total = allChunks.length
    let processed = 0
    let pending: ChunkInsert[] = []

    const flush = async (): Promise<void> => {
      if (pending.length === 0) return
      const batch = pending
      pending = []
      await db.transaction(async (tx) => {
        await tx.insert(chunks).values(batch)
      })
    }

    for (let i = 0; i < total; i += EMBED_BATCH_SIZE) {
      const group = allChunks.slice(i, i + EMBED_BATCH_SIZE)
      const vectors = await embedBatch(group.map((c) => c.content))

      group.forEach((chunk, idx) => {
        const embedding = vectors[idx]
        if (!embedding) return
        pending.push({
          repoId,
          filePath: chunk.filePath,
          language: chunk.language,
          symbolName: chunk.symbolName,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          content: chunk.content,
          embedding,
          tokenCount: chunk.tokenCount,
        })
      })

      processed += group.length
      if (pending.length >= INSERT_BATCH) await flush()

      // Progress climbs from 70 -> 95 across embedding.
      const progress =
        total === 0 ? 95 : 70 + Math.floor((processed / total) * 25)
      await job.updateProgress(progress)
      if (jobRow) {
        await db
          .update(indexingJobs)
          .set({ progress, currentStep: `Embedding ${processed}/${total}` })
          .where(eq(indexingJobs.id, jobRow.id))
      }
    }
    await flush()

    // 5. Ready -------------------------------------------------------------
    await db
      .update(repos)
      .set({
        chunkCount: allChunks.length,
        status: 'ready',
        indexedAt: new Date(),
      })
      .where(eq(repos.id, repoId))
    if (jobRow) {
      await db
        .update(indexingJobs)
        .set({
          status: 'ready',
          progress: 100,
          currentStep: 'Ready',
          finishedAt: new Date(),
        })
        .where(eq(indexingJobs.id, jobRow.id))
    }
    await job.updateProgress(100)

    const latencyMs = Date.now() - startedAt
    log.info(
      {
        repoId,
        fileCount: files.length,
        chunkCount: allChunks.length,
        sizeBytes,
        latencyMs,
      },
      'index-repo: ready',
    )
    capture(repo.userId, {
      event: 'repo_index_completed',
      properties: {
        repoId,
        githubUrl: repo.githubUrl,
        userId: repo.userId,
        fileCount: files.length,
        chunkCount: allChunks.length,
        sizeBytes,
        latencyMs,
      },
    })
    return {
      repoId,
      fileCount: files.length,
      chunkCount: allChunks.length,
      sizeBytes,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown indexing error'
    log.error({ repoId, err: error }, 'index-repo: failed')

    // Best-effort analytics — we may not have `repo` if the DB lookup failed.
    const failedRepo = await db.query.repos.findFirst({
      where: eq(repos.id, repoId),
    })
    if (failedRepo) {
      capture(failedRepo.userId, {
        event: 'repo_index_failed',
        properties: {
          repoId,
          githubUrl: failedRepo.githubUrl,
          userId: failedRepo.userId,
          error: message,
          latencyMs: Date.now() - startedAt,
        },
      })
    }

    await db
      .update(repos)
      .set({ status: 'failed', error: message })
      .where(eq(repos.id, repoId))
    if (jobRow) {
      await db
        .update(indexingJobs)
        .set({
          status: 'failed',
          currentStep: 'Failed',
          finishedAt: new Date(),
        })
        .where(eq(indexingJobs.id, jobRow.id))
    }
    throw error
  } finally {
    await rm(clonePath, { recursive: true, force: true }).catch(() => {})
  }
}
