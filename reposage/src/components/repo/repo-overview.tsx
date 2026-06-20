'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export interface ChatSummary {
  id: string
  title: string
  messageCount: number
  lastMessageAt: string | null
}

const SAMPLE_QUESTIONS = [
  'where is auth handled?',
  'how does the router work?',
  'show me the build pipeline',
  'what does the data layer look like?',
]

function formatWhen(iso: string | null): string {
  if (!iso) return 'no messages'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function RepoOverview({
  repoId,
  chats,
}: {
  repoId: string
  chats: ChatSummary[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function startChat(question?: string): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          repoId,
          title: question ?? 'New conversation',
        }),
      })
      if (!res.ok) {
        toast('Could not start chat', { description: 'Please try again.' })
        setBusy(false)
        return
      }
      const data = (await res.json()) as { chatId: string }
      const suffix = question ? `?q=${encodeURIComponent(question)}` : ''
      router.push(`/app/repos/${repoId}/chats/${data.chatId}${suffix}`)
    } catch {
      toast('Could not start chat', { description: 'Network error.' })
      setBusy(false)
    }
  }

  return (
    <div className="mt-12 space-y-12">
      <section>
        <div className="flex items-center justify-between">
          <p className="label-mark">Conversations</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startChat()}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--rs-amber)] px-4 py-2 font-mono text-xs tracking-[0.12em] text-[var(--accent-foreground)] uppercase disabled:opacity-60"
          >
            New chat
            <ArrowRight className="size-4" />
          </button>
        </div>

        {chats.length === 0 ? (
          <p className="text-muted-foreground mt-6 font-serif text-xl italic">
            No conversations yet.
          </p>
        ) : (
          <ul className="mt-4">
            {chats.map((chat, index) => (
              <li key={chat.id}>
                <a
                  href={`/app/repos/${repoId}/chats/${chat.id}`}
                  className="hover:bg-card/40 flex items-center gap-6 border-b py-5"
                >
                  <span className="text-muted-foreground w-8 shrink-0 font-mono text-sm">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-serif text-xl">
                    {chat.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    {chat.messageCount} msgs · {formatWhen(chat.lastMessageAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="label-mark mb-4">Stuff people ask</p>
        <div className="flex flex-wrap gap-3">
          {SAMPLE_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              disabled={busy}
              onClick={() => void startChat(question)}
              className="hover:border-foreground rounded-md border px-3 py-1.5 font-mono text-xs disabled:opacity-60"
            >
              {question}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
