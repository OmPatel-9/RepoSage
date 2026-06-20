'use client'

import { ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { CitationDialog } from '@/components/chat/citation-dialog'
import { MessageContent } from '@/components/chat/message-content'
import type { Citation, MessageRole } from '@/db/schema'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  citations: Citation[]
  model: string | null
  latencyMs: number | null
}

interface MessagesResponse {
  messages: ChatMessage[]
}

export function ChatView({
  repoId,
  chatId,
  repoName,
  repoStatus,
  filePaths,
  initialMessages,
  autoSend,
}: {
  repoId: string
  chatId: string
  repoName: string
  repoStatus: string
  filePaths: string[]
  initialMessages: ChatMessage[]
  autoSend?: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [dialogCitation, setDialogCitation] = useState<Citation | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streaming])

  const autoSentRef = useRef(false)
  useEffect(() => {
    if (autoSend && !autoSentRef.current && initialMessages.length === 0) {
      autoSentRef.current = true
      void send(autoSend)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend])

  async function send(content: string): Promise<void> {
    if (!content.trim() || isStreaming) return
    setInput('')
    setIsStreaming(true)
    setStreaming('')

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      citations: [],
      model: null,
      latencyMs: null,
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        toast(res.status === 429 ? 'Rate limit reached' : 'Chat failed', {
          description: data?.error ?? 'Please try again.',
        })
        setIsStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setStreaming(acc)
      }

      // Reload persisted messages (assistant row carries citations + meta).
      const refreshed = await fetch(`/api/chats/${chatId}/messages`)
      if (refreshed.ok) {
        const data = (await refreshed.json()) as MessagesResponse
        setMessages(data.messages)
      }
    } catch {
      toast('Chat failed', { description: 'Network error. Please try again.' })
    } finally {
      setStreaming('')
      setIsStreaming(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <Link
        href={`/app/repos/${repoId}`}
        className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-[0.12em] uppercase"
      >
        ← Back to repo
      </Link>

      <div className="mt-4 flex h-[calc(100svh-180px)] flex-col overflow-hidden rounded-md border border-[var(--border-strong)] bg-[var(--bg-alt)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
            <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
            <span className="size-2.5 rounded-full bg-[#2a2a2a]" />
          </div>
          <p className="font-mono text-xs">{repoName}</p>
          <p className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
            <span
              className={`size-2 rounded-full ${
                repoStatus === 'ready' ? 'bg-accent' : 'bg-[var(--rs-amber)]'
              }`}
            />
            {repoStatus === 'ready' ? 'indexed' : repoStatus}
          </p>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* File tree */}
          <aside className="hidden w-1/4 overflow-auto border-r py-2 md:block">
            {filePaths.map((path) => {
              const depth = path.split('/').length - 1
              const isActive = path === activeFile
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => setActiveFile(path)}
                  style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
                  className={`block w-full truncate py-1 pr-3 text-left font-mono text-xs hover:bg-[color-mix(in_oklch,var(--foreground),transparent_94%)] ${
                    isActive
                      ? 'text-foreground border-l-2 border-[var(--rs-amber)]'
                      : 'text-muted-foreground border-l-2 border-transparent'
                  }`}
                >
                  {path.split('/').pop()}
                </button>
              )
            })}
          </aside>

          {/* Chat column */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div ref={scrollRef} className="flex-1 space-y-6 overflow-auto p-5">
              {messages.length === 0 && !isStreaming ? (
                <p className="text-muted-foreground font-mono text-xs">
                  Ask a question about {repoName}.
                </p>
              ) : null}

              {messages.map((message) => (
                <MessageBlock
                  key={message.id}
                  message={message}
                  onCite={setDialogCitation}
                />
              ))}

              {isStreaming ? (
                <div className="flex gap-3">
                  <div className="grid size-7 shrink-0 place-items-center rounded-[3px] bg-[var(--rs-amber)] text-[var(--accent-foreground)]">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {streaming ? (
                      <MessageContent
                        content={streaming}
                        onCite={setDialogCitation}
                      />
                    ) : (
                      <span className="text-muted-foreground font-mono text-xs">
                        retrieving
                      </span>
                    )}
                    <span className="rs-blink" aria-hidden />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Terminal input */}
            <form
              className="flex items-center gap-2 border-t px-4 py-3"
              onSubmit={(e) => {
                e.preventDefault()
                void send(input)
              }}
            >
              <ChevronRight className="size-4 shrink-0 text-[var(--rs-amber)]" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isStreaming}
                spellCheck={false}
                autoComplete="off"
                placeholder="ask about this repository"
                className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent font-mono text-sm caret-[var(--rs-amber)] outline-none disabled:opacity-60"
              />
            </form>
          </div>
        </div>
      </div>

      <CitationDialog
        repoId={repoId}
        citation={dialogCitation}
        onClose={() => setDialogCitation(null)}
      />
    </main>
  )
}

function MessageBlock({
  message,
  onCite,
}: {
  message: ChatMessage
  onCite: (citation: Citation) => void
}) {
  const isUser = message.role === 'user'
  return (
    <div className="flex gap-3">
      <div
        className={`grid size-7 shrink-0 place-items-center rounded-[3px] ${
          isUser
            ? 'bg-[color-mix(in_oklch,var(--foreground),transparent_88%)]'
            : 'bg-[var(--rs-amber)] text-[var(--accent-foreground)]'
        }`}
      >
        {isUser ? (
          <span className="text-muted-foreground font-mono text-[9px] lowercase">
            you
          </span>
        ) : (
          <Sparkles className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {isUser ? (
          <p className="text-sm leading-7 whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <>
            <MessageContent content={message.content} onCite={onCite} />
            <div className="mt-3 border-t pt-2">
              <p className="text-muted-foreground font-mono text-[11px]">
                {message.citations.length} sources
                {message.latencyMs
                  ? ` · ${(message.latencyMs / 1000).toFixed(1)}s`
                  : ''}
                {message.model ? ` · ${message.model}` : ''}
                {' · '}
                <span className="cursor-pointer text-[var(--rs-amber)]">
                  view trace
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
