'use client'

import { useQuery } from '@tanstack/react-query'

import type { RepoStatusResponse } from '@/app/api/repos/[id]/route'

const TERMINAL = new Set(['ready', 'failed'])

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return mb.toFixed(1)
  return String(Math.max(1, Math.round(bytes / 1024)))
}

function sizeUnit(bytes: number): string {
  return bytes >= 1024 * 1024 ? 'megabytes' : 'kilobytes'
}

async function fetchStatus(id: string): Promise<RepoStatusResponse> {
  const res = await fetch(`/api/repos/${id}`)
  if (!res.ok) throw new Error('Failed to load repo status')
  return (await res.json()) as RepoStatusResponse
}

function Stat({
  value,
  unit,
  label,
}: {
  value: string
  unit?: string
  label: string
}) {
  return (
    <div className="flex-1 px-6 first:pl-0 last:pr-0">
      <p className="font-serif text-4xl leading-none">
        {value}
        {unit ? (
          <span className="text-muted-foreground ml-1 text-base">{unit}</span>
        ) : null}
      </p>
      <p className="label-mark mt-2">{label}</p>
    </div>
  )
}

export function RepoProgress({ initial }: { initial: RepoStatusResponse }) {
  const { data } = useQuery({
    queryKey: ['repo', initial.id],
    queryFn: () => fetchStatus(initial.id),
    initialData: initial,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && TERMINAL.has(status) ? false : 2000
    },
  })

  const repo = data
  const isTerminal = TERMINAL.has(repo.status)
  const isFailed = repo.status === 'failed'
  const isReady = repo.status === 'ready'

  return (
    <div>
      <section className="border-b py-8">
        <p className="label-mark mb-4">Status</p>
        <div
          className="h-px w-full overflow-hidden bg-[color-mix(in_oklch,var(--border),transparent_40%)]"
          role="progressbar"
          aria-valuenow={repo.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-px bg-[var(--rs-amber)] transition-[width] duration-700 ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, repo.progress))}%`,
              background: isReady
                ? 'var(--accent)'
                : isFailed
                  ? 'var(--destructive)'
                  : 'var(--rs-amber)',
            }}
          />
        </div>
        <p className="mt-4 font-mono text-sm">
          {isReady
            ? 'Index complete.'
            : isFailed
              ? `Failed: ${repo.error ?? 'unknown error'}`
              : repo.currentStep}
          {!isTerminal ? <span className="rs-blink" aria-hidden /> : null}
        </p>
      </section>

      <section className="flex border-b py-8">
        <Stat value={String(repo.fileCount)} label="Files" />
        <div className="bg-border w-px self-stretch" />
        <Stat value={String(repo.chunkCount)} label="Chunks" />
        <div className="bg-border w-px self-stretch" />
        <Stat
          value={formatSize(repo.sizeBytes)}
          unit={sizeUnit(repo.sizeBytes) === 'megabytes' ? 'MB' : 'KB'}
          label="Size"
        />
      </section>

      {isReady ? (
        <p className="text-muted-foreground mt-8 font-mono text-xs">
          Chunking and embedding arrive in the next step.
        </p>
      ) : null}
    </div>
  )
}
