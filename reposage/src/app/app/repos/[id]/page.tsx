import { and, desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { RepoStatusResponse } from '@/app/api/repos/[id]/route'
import { RepoProgress } from '@/components/repo/repo-progress'
import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'
import { db } from '@/db'
import { indexingJobs, repos } from '@/db/schema'
import { requireUser } from '@/lib/auth'

function fallbackProgress(status: string): number {
  if (status === 'cloning') return 10
  if (status === 'walking') return 30
  if (status === 'ready') return 100
  return 0
}

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  const { id } = await params

  const repo = await db.query.repos.findFirst({
    where: and(eq(repos.id, id), eq(repos.userId, user.id)),
  })
  if (!repo) notFound()

  const latestJob = await db.query.indexingJobs.findFirst({
    where: eq(indexingJobs.repoId, id),
    orderBy: desc(indexingJobs.startedAt),
  })

  const initial: RepoStatusResponse = {
    id: repo.id,
    owner: repo.owner,
    name: repo.name,
    status: repo.status,
    fileCount: repo.fileCount,
    chunkCount: repo.chunkCount,
    sizeBytes: repo.sizeBytes,
    progress: latestJob?.progress ?? fallbackProgress(repo.status),
    currentStep: latestJob?.currentStep ?? 'Queued',
    error: repo.error,
  }

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <Link
            href="/app"
            className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-[0.12em] uppercase"
          >
            ← Back to dashboard
          </Link>

          <div className="mt-6 border-b pb-8">
            <p className="label-mark mb-3">Repo</p>
            <h1 className="text-4xl font-semibold break-words sm:text-5xl">
              <span className="text-muted-foreground">{repo.owner} / </span>
              {repo.name}
            </h1>
          </div>

          <RepoProgress initial={initial} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
