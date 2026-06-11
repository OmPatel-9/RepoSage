import { complete } from '@/lib/ai/client'
import { getCurrentUser, UnauthorizedError } from '@/lib/auth'
import { RateLimitError } from '@/lib/rate-limit'

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser()

    const result = await complete({
      userId: user.id,
      kind: 'chat',
      modelTier: 'fast',
      messages: [{ role: 'user', content: 'Say hello in exactly five words.' }],
    })

    return Response.json({
      text: result.text,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      usage: result.usage,
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429 })
    }
    // Log full detail server-side, return a generic message to the client.
    console.error('test-llm route failed:', error)
    return Response.json(
      { error: 'The model request failed. Try again shortly.' },
      { status: 500 },
    )
  }
}
