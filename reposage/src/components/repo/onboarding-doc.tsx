'use client'

import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { toast } from 'sonner'

import { generateDocAction } from '@/lib/actions/generate-doc'

type View = 'empty' | 'generating' | 'done'

function childrenToText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(childrenToText).join('')
  return ''
}

const docComponents: Components = {
  h1: ({ children }) => {
    const text = childrenToText(children)
    const words = text.split(' ')
    const last = words.length > 1 ? words.pop() : null
    return (
      <h1 className="mt-0 mb-5 font-serif text-4xl font-normal">
        {words.join(' ')}
        {last ? <em className="italic"> {last}</em> : null}
      </h1>
    )
  },
  h2: ({ children }) => {
    const text = childrenToText(children)
    return (
      <div className="mt-10 mb-4">
        <p className="label-mark mb-2">{text}</p>
        <h2 className="font-serif text-2xl font-normal">{text}</h2>
      </div>
    )
  },
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 text-base font-semibold">{children}</h3>
  ),
}

export function OnboardingDoc({
  repoId,
  initialMarkdown,
}: {
  repoId: string
  initialMarkdown: string | null
}) {
  const [view, setView] = useState<View>(initialMarkdown ? 'done' : 'empty')
  const [markdown, setMarkdown] = useState<string | null>(initialMarkdown)
  const [progress, setProgress] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling(): void {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function loadDoc(): Promise<void> {
    const res = await fetch(`/api/repos/${repoId}/doc`)
    if (!res.ok) return
    const data = (await res.json()) as {
      doc: { markdown: string } | null
    }
    if (data.doc) {
      setMarkdown(data.doc.markdown)
      setView('done')
    }
  }

  function pollJob(jobId: string): void {
    stopPolling()
    pollRef.current = setInterval(() => {
      void (async () => {
        const res = await fetch(`/api/jobs/${jobId}`)
        if (!res.ok) return
        const data = (await res.json()) as {
          state: string
          progress: number | object
        }
        if (typeof data.progress === 'number') setProgress(data.progress)
        if (data.state === 'completed') {
          stopPolling()
          await loadDoc()
        } else if (data.state === 'failed') {
          stopPolling()
          toast('Doc generation failed', { description: 'Please try again.' })
          setView(markdown ? 'done' : 'empty')
        }
      })()
    }, 3000)
  }

  async function generate(): Promise<void> {
    setView('generating')
    setProgress(0)
    const result = await generateDocAction(repoId)
    if (!result.ok || !result.jobId) {
      toast('Could not start generation', {
        description: result.error ?? 'Please try again.',
      })
      setView(markdown ? 'done' : 'empty')
      return
    }
    pollJob(result.jobId)
  }

  function download(): void {
    if (!markdown) return
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'onboarding.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (view === 'generating') {
    return (
      <section className="border-b py-10">
        <div className="mb-6 h-px w-full overflow-hidden bg-[color-mix(in_oklch,var(--border),transparent_40%)]">
          <div
            className="h-px bg-[var(--rs-amber)] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
          />
        </div>
        <p className="label-mark mb-3">Doc</p>
        <h2 className="font-serif text-3xl font-normal">
          Writing your <span className="italic">doc...</span>
        </h2>
        <p className="text-muted-foreground mt-3 font-mono text-xs">
          This takes about 30 seconds
          <span className="rs-blink" aria-hidden />
        </p>
      </section>
    )
  }

  if (view === 'done' && markdown) {
    return (
      <section className="border-b py-10">
        <div className="flex items-start justify-between">
          <p className="label-mark">Doc</p>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={download}
              className="text-foreground hover:text-muted-foreground inline-flex items-center gap-1 font-mono text-xs"
            >
              Download as .md
              <ArrowUpRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void generate()}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono text-xs"
            >
              Regenerate
            </button>
          </div>
        </div>
        <div className="rs-doc mt-6">
          <ReactMarkdown components={docComponents}>{markdown}</ReactMarkdown>
        </div>
      </section>
    )
  }

  return (
    <section className="border-b py-10">
      <p className="label-mark mb-3">Doc</p>
      <h2 className="font-serif text-3xl font-normal">
        No doc <span className="italic">generated yet.</span>
      </h2>
      <button
        type="button"
        onClick={() => void generate()}
        className="text-foreground hover:text-muted-foreground mt-3 inline-flex items-center gap-1.5 font-mono text-xs"
      >
        Generate one
        <ArrowRight className="size-4" />
      </button>
    </section>
  )
}
