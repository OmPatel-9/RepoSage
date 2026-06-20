import { and, asc, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

import { ChatView, type ChatMessage } from '@/components/chat/chat-view'
import { db } from '@/db'
import { chats, chunks, messages, repos } from '@/db/schema'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; chatId: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requireUser()
  const { id, chatId } = await params
  const { q } = await searchParams

  const repo = await db.query.repos.findFirst({
    where: and(eq(repos.id, id), eq(repos.userId, user.id)),
  })
  if (!repo) notFound()

  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, user.id)),
  })
  if (!chat || chat.repoId !== id) notFound()

  const history = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: asc(messages.createdAt),
  })

  // Distinct file paths for the file tree.
  const fileRows = await db
    .selectDistinct({ filePath: chunks.filePath })
    .from(chunks)
    .where(eq(chunks.repoId, id))
    .orderBy(asc(chunks.filePath))

  const initialMessages: ChatMessage[] = history.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    citations: m.citations ?? [],
    model: m.model,
    latencyMs: m.latencyMs,
  }))

  return (
    <ChatView
      repoId={id}
      chatId={chatId}
      repoName={`${repo.owner}/${repo.name}`}
      repoStatus={repo.status}
      filePaths={fileRows.map((f) => f.filePath)}
      initialMessages={initialMessages}
      autoSend={q}
    />
  )
}
