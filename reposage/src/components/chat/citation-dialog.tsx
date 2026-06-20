'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { SnippetResponse } from '@/app/api/repos/[id]/snippet/route'
import type { Citation } from '@/db/schema'

export function CitationDialog({
  repoId,
  citation,
  onClose,
}: {
  repoId: string
  citation: Citation | null
  onClose: () => void
}) {
  const [snippet, setSnippet] = useState<SnippetResponse | null>(null)
  const [highlighted, setHighlighted] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!citation) return
    setSnippet(null)
    setHighlighted([])
    setError(null)

    const controller = new AbortController()
    void (async () => {
      try {
        const url = `/api/repos/${repoId}/snippet?path=${encodeURIComponent(
          citation.filePath,
        )}&start=${citation.startLine}&end=${citation.endLine}`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) {
          setError('Could not load this snippet.')
          return
        }
        const data = (await res.json()) as SnippetResponse
        setSnippet(data)

        // Highlight per-line with Shiki, then split into lines for borders.
        const { codeToHtml } = await import('shiki')
        const html = await codeToHtml(data.content, {
          lang: shikiLang(data.language),
          theme: 'github-light',
        })
        const lines = html
          .replace(/^<pre[^>]*><code[^>]*>/, '')
          .replace(/<\/code><\/pre>$/, '')
          .split('\n')
        setHighlighted(lines)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError('Could not render this snippet.')
        }
      }
    })()

    return () => controller.abort()
  }, [citation, repoId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!citation) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-md border border-[var(--border-strong)] bg-[var(--bg-alt)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-mono text-xs">
            {citation.filePath}
            <span className="text-[var(--rs-amber)]">
              {' '}
              :{citation.startLine}-{citation.endLine}
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground font-mono"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-auto p-4">
          {error ? (
            <p className="text-muted-foreground font-mono text-xs">{error}</p>
          ) : !snippet || highlighted.length === 0 ? (
            <p className="text-muted-foreground font-mono text-xs">
              Loading snippet
              <span className="rs-blink" aria-hidden />
            </p>
          ) : (
            <pre className="overflow-auto font-mono text-xs leading-5">
              {highlighted.map((lineHtml, idx) => {
                const lineNo = snippet.startLine + idx
                const cited =
                  lineNo >= snippet.citedStart && lineNo <= snippet.citedEnd
                return (
                  <div
                    key={idx}
                    className={
                      cited
                        ? 'border-l-2 border-[var(--rs-amber)] bg-[color-mix(in_oklch,var(--rs-amber),transparent_92%)] pl-3'
                        : 'border-l-2 border-transparent pl-3'
                    }
                  >
                    <span className="text-muted-foreground mr-3 inline-block w-8 text-right select-none">
                      {lineNo}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: lineHtml }} />
                  </div>
                )
              })}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

function shikiLang(language: string): string {
  const map: Record<string, string> = {
    typescript: 'typescript',
    javascript: 'javascript',
    python: 'python',
    go: 'go',
    rust: 'rust',
    java: 'java',
    ruby: 'ruby',
    php: 'php',
    csharp: 'csharp',
    markdown: 'markdown',
    json: 'json',
    yaml: 'yaml',
    css: 'css',
    html: 'html',
    bash: 'bash',
  }
  return map[language] ?? 'text'
}
