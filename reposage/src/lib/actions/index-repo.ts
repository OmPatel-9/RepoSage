'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '../../db'
import { repos } from '../../db/schema'
import {
  getRepoMeta,
  parseGithubUrl,
  RepoNotFoundError,
  RepoPrivateError,
} from '../github'
import { enqueueIndexRepo } from '../queue/client'
import { RateLimitError, enforceRateLimit } from '../rate-limit'
import { getCurrentUser, UnauthorizedError } from '../auth'

const inputSchema = z.object({
  githubUrl: z.string().trim().min(1, 'Enter a GitHub repository URL.'),
})

/** Largest repo we accept, in kilobytes (30 MB). */
const MAX_REPO_KB = 30 * 1024

export interface IndexRepoState {
  ok: boolean
  repoId?: string
  error?: string
  /** 'rate-limit' lets the client show a styled toast; 'auth' triggers redirect. */
  code?:
    | 'rate-limit'
    | 'auth'
    | 'invalid'
    | 'not-found'
    | 'private'
    | 'too-large'
    | 'unknown'
}

/**
 * Validates a GitHub URL, creates a pending repos row, and enqueues indexing.
 * Shaped for `useActionState`: takes (prevState, formData), returns state.
 */
export async function indexRepoAction(
  _prevState: IndexRepoState,
  formData: FormData,
): Promise<IndexRepoState> {
  let userId: string
  try {
    const user = await getCurrentUser()
    userId = user.id
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, code: 'auth', error: 'Sign in to index a repo.' }
    }
    throw error
  }

  const parsed = inputSchema.safeParse({ githubUrl: formData.get('githubUrl') })
  if (!parsed.success) {
    return {
      ok: false,
      code: 'invalid',
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    }
  }

  try {
    await enforceRateLimit(userId, 'index')
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, code: 'rate-limit', error: error.message }
    }
    throw error
  }

  const ref = parseGithubUrl(parsed.data.githubUrl)
  if (!ref) {
    return {
      ok: false,
      code: 'invalid',
      error: 'That does not look like a GitHub repository URL.',
    }
  }

  try {
    const meta = await getRepoMeta(ref.owner, ref.name)

    if (!meta.exists) {
      return { ok: false, code: 'not-found', error: 'Repository not found.' }
    }
    if (!meta.isPublic) {
      return {
        ok: false,
        code: 'private',
        error: 'Only public repositories are supported right now.',
      }
    }
    if (meta.sizeKb > MAX_REPO_KB) {
      return {
        ok: false,
        code: 'too-large',
        error: 'Repository exceeds the 30 MB limit.',
      }
    }

    const [created] = await db
      .insert(repos)
      .values({
        userId,
        githubUrl: `https://github.com/${ref.owner}/${ref.name}`,
        owner: ref.owner,
        name: ref.name,
        defaultBranch: meta.defaultBranch,
        status: 'pending',
      })
      .returning({ id: repos.id })

    if (!created) {
      return { ok: false, code: 'unknown', error: 'Could not create repo.' }
    }

    await enqueueIndexRepo({ repoId: created.id })
    revalidatePath('/app')

    return { ok: true, repoId: created.id }
  } catch (error) {
    if (error instanceof RepoNotFoundError) {
      return { ok: false, code: 'not-found', error: 'Repository not found.' }
    }
    if (error instanceof RepoPrivateError) {
      return {
        ok: false,
        code: 'private',
        error: 'Only public repositories are supported right now.',
      }
    }
    console.error('indexRepoAction failed:', error)
    return {
      ok: false,
      code: 'unknown',
      error: 'Something went wrong starting the index.',
    }
  }
}
