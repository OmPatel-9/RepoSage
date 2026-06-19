import { Octokit } from 'octokit'

export interface GithubRepoRef {
  owner: string
  name: string
}

export interface RepoMeta {
  defaultBranch: string
  sizeKb: number
  isPublic: boolean
  exists: boolean
  language: string | null
}

export class RepoNotFoundError extends Error {
  constructor(public readonly ref: GithubRepoRef) {
    super(`Repository ${ref.owner}/${ref.name} was not found.`)
    this.name = 'RepoNotFoundError'
  }
}

export class RepoPrivateError extends Error {
  constructor(public readonly ref: GithubRepoRef) {
    super(`Repository ${ref.owner}/${ref.name} is private or inaccessible.`)
    this.name = 'RepoPrivateError'
  }
}

const OWNER_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/
const REPO_NAME = /^[A-Za-z0-9._-]+$/

/**
 * Accepts full GitHub URLs (https/http, optional .git, optional trailing
 * slash) and the shorthand `owner/name`. Returns the ref or null if it
 * doesn't look like a GitHub repo.
 */
export function parseGithubUrl(input: string): GithubRepoRef | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let owner: string | undefined
  let name: string | undefined

  if (/^(https?:\/\/|git@|github\.com)/i.test(trimmed)) {
    // Normalise git@github.com:owner/name and bare github.com/owner/name.
    const normalized = trimmed
      .replace(/^git@github\.com:/i, 'https://github.com/')
      .replace(/^github\.com\//i, 'https://github.com/')
    let url: URL
    try {
      url = new URL(normalized)
    } catch {
      return null
    }
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return null
    const parts = url.pathname.split('/').filter(Boolean)
    owner = parts[0]
    name = parts[1]
  } else {
    const parts = trimmed.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    owner = parts[0]
    name = parts[1]
  }

  if (!owner || !name) return null
  name = name.replace(/\.git$/i, '')

  if (!OWNER_NAME.test(owner) || !REPO_NAME.test(name)) return null
  return { owner, name }
}

/**
 * Fetches public repository metadata using an unauthenticated Octokit client.
 * Throws RepoNotFoundError (404) and RepoPrivateError (403). A successful
 * call always describes a public repo (private ones 404 unauthenticated).
 */
export async function getRepoMeta(
  owner: string,
  name: string,
): Promise<RepoMeta> {
  const octokit = new Octokit()
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo: name })
    return {
      defaultBranch: data.default_branch,
      sizeKb: data.size,
      isPublic: data.private === false,
      exists: true,
      language: data.language ?? null,
    }
  } catch (error: unknown) {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: number }).status
        : undefined
    if (status === 404) throw new RepoNotFoundError({ owner, name })
    if (status === 403 || status === 401) {
      throw new RepoPrivateError({ owner, name })
    }
    throw error
  }
}
