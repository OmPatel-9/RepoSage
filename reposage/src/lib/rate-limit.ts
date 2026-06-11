import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

import { env } from '../env'

export type RateLimitKind = 'chat' | 'index' | 'doc'

export class RateLimitError extends Error {
  constructor(
    public readonly kind: RateLimitKind,
    public readonly retryAfterSeconds: number,
  ) {
    super(
      `Rate limit exceeded for ${kind}. Try again in ${retryAfterSeconds}s.`,
    )
    this.name = 'RateLimitError'
  }
}

/** Requests allowed per hour, per user, per kind. */
const LIMITS: Record<RateLimitKind, number> = {
  chat: 30,
  index: 5,
  doc: 5,
}

const WINDOW_MS = 60 * 60 * 1000

const hasUpstash = Boolean(
  env.UPSTASH_REDIS_REST_URL &&
  env.UPSTASH_REDIS_REST_TOKEN &&
  // Treat the .env.example placeholder as "not configured".
  !env.UPSTASH_REDIS_REST_URL.includes('example.upstash.io'),
)

// Cached on globalThis so Next.js HMR doesn't reset limiter state in dev.
const globalForRateLimit = globalThis as unknown as {
  upstashLimiters?: Partial<Record<RateLimitKind, Ratelimit>>
  memoryHits?: Map<string, number[]>
}

function upstashLimiter(kind: RateLimitKind): Ratelimit {
  globalForRateLimit.upstashLimiters ??= {}
  globalForRateLimit.upstashLimiters[kind] ??= new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL as string,
      token: env.UPSTASH_REDIS_REST_TOKEN as string,
    }),
    limiter: Ratelimit.slidingWindow(LIMITS[kind], '1 h'),
    prefix: `reposage:rl:${kind}`,
  })
  return globalForRateLimit.upstashLimiters[kind]
}

function memoryLimit(
  key: string,
  limit: number,
): { success: boolean; retryAfterSeconds: number } {
  globalForRateLimit.memoryHits ??= new Map()
  const now = Date.now()
  const hits = (globalForRateLimit.memoryHits.get(key) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  )

  if (hits.length >= limit) {
    globalForRateLimit.memoryHits.set(key, hits)
    const oldest = hits[0] ?? now
    return {
      success: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldest + WINDOW_MS - now) / 1000),
      ),
    }
  }

  hits.push(now)
  globalForRateLimit.memoryHits.set(key, hits)
  return { success: true, retryAfterSeconds: 0 }
}

/**
 * Throws RateLimitError when the user exceeds the hourly limit for `kind`.
 * Uses Upstash when configured, otherwise an in-memory sliding window
 * (fine for local dev; resets on server restart).
 */
export async function enforceRateLimit(
  userId: string,
  kind: RateLimitKind,
): Promise<void> {
  const key = `${kind}:${userId}`

  if (hasUpstash) {
    const { success, reset } = await upstashLimiter(kind).limit(key)
    if (!success) {
      throw new RateLimitError(
        kind,
        Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
      )
    }
    return
  }

  const result = memoryLimit(key, LIMITS[kind])
  if (!result.success) {
    throw new RateLimitError(kind, result.retryAfterSeconds)
  }
}
