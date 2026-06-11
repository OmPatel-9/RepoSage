'use server'

import { complete } from '../ai/client'
import { getCurrentUser, UnauthorizedError } from '../auth'
import { RateLimitError } from '../rate-limit'

export interface TestLlmResult {
  ok: boolean
  text?: string
  provider?: string
  model?: string
  latencyMs?: number
  status?: number
  error?: string
}

export async function testLlm(): Promise<TestLlmResult> {
  try {
    const user = await getCurrentUser()

    const result = await complete({
      userId: user.id,
      kind: 'chat',
      modelTier: 'fast',
      messages: [{ role: 'user', content: 'Say hello in exactly five words.' }],
    })

    return {
      ok: true,
      text: result.text,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, status: 401, error: 'Sign in required.' }
    }
    if (error instanceof RateLimitError) {
      return { ok: false, status: 429, error: error.message }
    }
    console.error('testLlm action failed:', error)
    return {
      ok: false,
      status: 500,
      error: 'The model request failed. Try again shortly.',
    }
  }
}
