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
  userId: string
  messages: ModelMessage[]
  modelTier?: ModelTier
  system?: string
  kind?: RateLimitKind
  skipRateLimit?: boolean
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

function forceFallback(): boolean {
  return process.env.FORCE_LLM_FALLBACK === '1'
}

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
  await logUsage({ userId, provider: meta.provider, model: meta.model, usage })
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
  if (!options.skipRateLimit) {
    await enforceRateLimit(options.userId, options.kind ?? 'chat')
  }

  const { primary, fallback } = modelsForTier(options.modelTier ?? 'fast')
  const candidates = forceFallback() ? [fallback] : [primary, fallback]

  // generateObject's generic is a conditional type that cannot resolve over
  // an unbound T; this alias pins the call signature we actually use.
  const callGenerateObject = generateObject as unknown as (opts: {
    model: LanguageModelV3
    messages: ModelMessage[]
    system?: string
    schema: z.ZodType<T>
    providerOptions?: Record<string, Record<string, unknown>>
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
          // Groq's llama models reject `json_schema`; disable strict
          // structured output so the provider uses json_object mode and the
          // SDK validates against the Zod schema locally. Ignored by Google.
          providerOptions: { groq: { structuredOutputs: false } },
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
      // For structured (schema) calls, fall back on ANY error: Groq's llama
      // models don't reliably produce schema-valid JSON, but the Google
      // fallback supports native structured output and enforces the schema.
      const canFallback =
        hasNext && (isRetryableError(error) || options.schema != null)
      if (!canFallback) {
        throw error
      }
      console.warn(
        `Model ${model.modelId} failed, falling back to next provider.`,
      )
    }
  }

  throw lastError
}

export interface StreamCompletion {
  text: string
  latencyMs: number
  provider: string
  model: string
}

export async function stream(
  options: BaseOptions & {
    /** Runs after the stream finishes (e.g. persist the assistant message). */
    onComplete?: (result: StreamCompletion) => Promise<void> | void
  },
) {
  await enforceRateLimit(options.userId, options.kind ?? 'chat')

  const { primary, fallback } = modelsForTier(options.modelTier ?? 'fast')
  const startedAt = Date.now()

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
    onFinish: async ({ text, usage }) => {
      await logUsage({
        userId: options.userId,
        provider: used.model.provider,
        model: used.model.modelId,
        usage,
      })
      if (options.onComplete) {
        await options.onComplete({
          text,
          latencyMs: Date.now() - startedAt,
          provider: used.model.provider,
          model: used.model.modelId,
        })
      }
    },
  })
}
