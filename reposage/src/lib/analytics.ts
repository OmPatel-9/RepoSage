/**
 * Server-side analytics wrapper (posthog-node).
 *
 * All feature code should import from here, never from posthog-node directly.
 * The client is lazily initialised so environments without POSTHOG_KEY
 * (e.g. local dev, unit tests) simply no-op instead of crashing.
 */

import { PostHog } from 'posthog-node'

// ---------------------------------------------------------------------------
// Singleton client (lazy)
// ---------------------------------------------------------------------------
let _client: PostHog | null = null

function getClient(): PostHog | null {
  if (_client) return _client

  const key = process.env.POSTHOG_KEY
  const host = process.env.POSTHOG_HOST

  if (!key || !host) return null

  _client = new PostHog(key, {
    host,
    // Flush immediately in serverless/worker environments — we don't get a
    // graceful shutdown window to flush a queue.
    flushAt: 1,
    flushInterval: 0,
  })
  return _client
}

// ---------------------------------------------------------------------------
// Event types — keep in sync with the PostHog dashboard
// ---------------------------------------------------------------------------
export type AnalyticsEvent =
  | {
      event: 'repo_index_started'
      properties: { repoId: string; githubUrl: string; userId: string }
    }
  | {
      event: 'repo_index_completed'
      properties: {
        repoId: string
        githubUrl: string
        userId: string
        fileCount: number
        chunkCount: number
        sizeBytes: number
        latencyMs: number
      }
    }
  | {
      event: 'repo_index_failed'
      properties: {
        repoId: string
        githubUrl: string
        userId: string
        error: string
        latencyMs: number
      }
    }
  | {
      event: 'chat_question_asked'
      properties: {
        repoId: string
        userId: string
        questionLength: number
      }
    }
  | {
      event: 'chat_response_received'
      properties: {
        repoId: string
        userId: string
        model: string
        citationCount: number
        latencyMs: number
        success: boolean
      }
    }
  | {
      event: 'doc_generated'
      properties: {
        repoId: string
        userId: string
        model: string
        latencyMs: number
        success: boolean
      }
    }

/**
 * Capture a server-side analytics event.
 *
 * @param distinctId  - User identifier (Clerk user ID or 'anon').
 * @param payload     - Strongly-typed event + properties.
 */
export function capture(distinctId: string, payload: AnalyticsEvent): void {
  const client = getClient()
  if (!client) return // no-op when PostHog is not configured

  client.capture({
    distinctId,
    event: payload.event,
    properties: payload.properties,
  })
}

/**
 * Must be called before the process exits in long-running services (worker).
 * Flushes any buffered events.
 */
export async function shutdownAnalytics(): Promise<void> {
  if (_client) {
    await _client.shutdown()
    _client = null
  }
}
