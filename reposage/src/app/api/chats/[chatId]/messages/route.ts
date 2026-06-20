import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { chats, messages, type Citation } from '@/db/schema'
import type { ModelMessage } from 'ai'

import { stream } from '@/lib/ai/client'
import { getCurrentUser, UnauthorizedError } from '@/lib/auth'
import { buildChatSystemPrompt } from '@/lib/prompts/chat'
import { assembleContext } from '@/lib/retrieval/context'
import { searchChunks } from '@/lib/retrieval/search'
import { RateLimitError } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

const bodySchema = z.object({
  content: z.string().trim().min(1).max(8000),
})

const CITATION_RE = /\[([^\]\s:]+):(\d+)-(\d+)\]/g

function extractCitations(text: string): Citation[] {
  const seen = new Set<string>()
  const out: Citation[] = []
  for (const match of text.matchAll(CITATION_RE)) {
    const key = match[0]
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      filePath: match[1] as string,
      startLine: Number(match[2]),
      endLine: Number(match[3]),
    })
  }
  return out
}

export async function POST(
  req: Request,
  context: { params: Promise<{ chatId: string }> },
): Promise<Response> {
  try {
    const user = await getCurrentUser()
    const { chatId } = await context.params

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: 'Message is required.' }, { status: 400 })
    }

    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, user.id)),
    })
    if (!chat) {
      return Response.json({ error: 'Chat not found.' }, { status: 404 })
    }

    // Persist the user's message first.
    await db.insert(messages).values({
      chatId,
      role: 'user',
      content: parsed.data.content,
    })

    // Retrieve + assemble grounding context for this repo.
    const chunks = await searchChunks(chat.repoId, parsed.data.content, 20)
    const { contextString } = assembleContext(chunks, 3000)
    const systemPrompt = buildChatSystemPrompt(contextString)

    // Build conversation history (ModelMessages) from the DB.
    const history = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: asc(messages.createdAt),
    })
    const modelMessages: ModelMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const result = await stream({
      userId: user.id,
      kind: 'chat',
      modelTier: 'smart',
      system: systemPrompt,
      messages: modelMessages,
      onComplete: async ({ text, latencyMs, model }) => {
        await db.insert(messages).values({
          chatId,
          role: 'assistant',
          content: text,
          citations: extractCitations(text),
          model,
          latencyMs,
        })
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429 })
    }
    console.error('messages POST failed:', error)
    return Response.json({ error: 'The chat request failed.' }, { status: 500 })
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ chatId: string }> },
): Promise<Response> {
  try {
    const user = await getCurrentUser()
    const { chatId } = await context.params

    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, user.id)),
    })
    if (!chat) {
      return Response.json({ error: 'Chat not found.' }, { status: 404 })
    }

    const rows = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: asc(messages.createdAt),
    })

    return Response.json({ messages: rows })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    console.error('messages GET failed:', error)
    return Response.json({ error: 'Could not load messages.' }, { status: 500 })
  }
}
