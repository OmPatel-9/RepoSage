import type {
  LanguageModelV3,
  LanguageModelV3Middleware,
} from '@ai-sdk/provider'
import {
  APICallError,
  generateObject,
  generateText,
  streamText,
  wrapLanguageModel,
} from 'ai'
import type { LanguageModelUsage, ModelMessage } from 'ai'
import type { z } from 'zod'

import { db } from '../../db'
import { apiUsage } from '../../db/schema'
import { enforceRateLimit } from '../rate-limit'
import type { RateLimitKind } from '../rate-limit'

import {
  getFallbackFastModel,
  getFallbackSmartModel,
  getFastModel,
  getSmartModel,
} from './providers'

export type ModelTier = 'fast' | 'smart'

interface BaseOptions {
  /** RepoSage user id (users.id) — used for rate limiting and usage logging. */
  userId: string
  messages: ModelMessage[]
  modelTier?: ModelTier
  system?: string
  /** Rate limit bucket. Defaults to 'chat'. */
  kind?: RateLimitKind
}

export interface CompletionMeta {
  usage: { inputTokens: number; outputTokens: number }
  latencyMs: number
  provider: string
  model: string
}

function modelsForTier(tier: ModelTier): {
  primary: LanguageModelV3
  fallback: LanguageModelV3
} {
  return tier === 'smart'
    ? { primary: getSmartModel(), fallback: getFallbackSmartModel() }
    : { primary: getFastModel(), fallback: getFallbackFastModel() }
}

/** Dev escape hatch: FORCE_LLM_FALLBACK=1 skips the primary provider. */
function forceFallback(): boolean {
  return process.env.FORCE_LLM_FALLBACK === '1'
}

/** Fall back only on rate limits (429) and provider-side failures (5xx). */
function isRetryableError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode
    return status === 429 || (typeof status === 'number' && status >= 500)
  }
  return false
}

async function logUsage(options: {
  userId: string
  provider: string
  model: string
  usage: LanguageModelUsage
}): Promise<void> {
  try {
    await db.insert(apiUsage).values({
      userId: options.userId,
      provider: options.provider,
      model: options.model,
      inputTokens: options.usage.inputTokens ?? 0,
      outputTokens: options.usage.outputTokens ?? 0,
    })
  } catch (error) {
    // Usage logging must never break the request path.
    console.error('Failed to log API usage:', error)
  }
}

async function buildMeta(
  model: LanguageModelV3,
  usage: LanguageModelUsage,
  startedAt: number,
  userId: string,
): Promise<CompletionMeta> {
  const meta: CompletionMeta = {
    usage: {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    },
    latencyMs: Date.now() - startedAt,
    provider: model.provider,
    model: model.modelId,
  }
  await logUsage({
    userId,
    provider: meta.provider,
    model: meta.model,
    usage,
  })
  return meta
}

export async function complete(
  options: BaseOptions,
): Promise<CompletionMeta & { text: string }>
export async function complete<T>(
  options: BaseOptions & { schema: z.ZodType<T> },
): Promise<CompletionMeta & { object: T }>
export async function complete<T>(
  options: BaseOptions & { schema?: z.ZodType<T> },
): Promise<CompletionMeta & ({ text: string } | { object: T })> {
  await enforceRateLimit(options.userId, options.kind ?? 'chat')

  const { primary, fallback } = modelsForTier(options.modelTier ?? 'fast')
  const candidates = forceFallback() ? [fallback] : [primary, fallback]

  // generateObject's generic is a conditional type that cannot resolve over
  // an unbound T; this alias pins the call signature we actually use.
  const callGenerateObject = generateObject as unknown as (opts: {
    model: LanguageModelV3
    messages: ModelMessage[]
    system?: string
    schema: z.ZodType<T>
  }) => Promise<{ object: T; usage: LanguageModelUsage }>

  let lastError: unknown
  for (const [i, model] of candidates.entries()) {
    const startedAt = Date.now()
    try {
      if (options.schema) {
        const result = await callGenerateObject({
          model,
          messages: options.messages,
          system: options.system,
          schema: options.schema,
        })
        const meta = await buildMeta(
          model,
          result.usage,
          startedAt,
          options.userId,
        )
        return { object: result.object, ...meta }
      }

      const result = await generateText({
        model,
        messages: options.messages,
        system: options.system,
      })
      const meta = await buildMeta(
        model,
        result.usage,
        startedAt,
        options.userId,
      )
      return { text: result.text, ...meta }
    } catch (error) {
      lastError = error
      const hasNext = i < candidates.length - 1
      if (!hasNext || !isRetryableError(error)) {
        throw error
      }
      console.warn(
        `Primary model ${model.modelId} failed (retryable), falling back.`,
      )
    }
  }

  throw lastError
}

export async function stream(options: BaseOptions) {
  await enforceRateLimit(options.userId, options.kind ?? 'chat')

  const { primary, fallback } = modelsForTier(options.modelTier ?? 'fast')

  // Tracks which model actually served the request, for usage logging.
  const used = { model: forceFallback() ? fallback : primary }

  const middleware: LanguageModelV3Middleware = {
    specificationVersion: 'v3',
    wrapStream: async ({ doStream, params }) => {
      try {
        return await doStream()
      } catch (error) {
        if (!isRetryableError(error)) {
          throw error
        }
        console.warn(
          `Primary model ${primary.modelId} failed (retryable), falling back.`,
        )
        used.model = fallback
        return fallback.doStream(params)
      }
    },
  }

  const model = forceFallback()
    ? fallback
    : wrapLanguageModel({ model: primary, middleware })

  return streamText({
    model,
    messages: options.messages,
    system: options.system,
    onFinish: async ({ usage }) => {
      await logUsage({
        userId: options.userId,
        provider: used.model.provider,
        model: used.model.modelId,
        usage,
      })
    },
  })
}
