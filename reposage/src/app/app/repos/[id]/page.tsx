import { and, desc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { RepoStatusResponse } from '@/app/api/repos/[id]/route'
import { RepoOverview, type ChatSummary } from '@/components/repo/repo-overview'
import { RepoProgress } from '@/components/repo/repo-progress'
import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'
import { db } from '@/db'
import { chats, indexingJobs, messages, repos } from '@/db/schema'
import { requireUser } from '@/lib/auth'

function fallbackProgress(status: string): number {
  if (status === 'cloning') return 10
  if (status === 'walking') return 30
  if (status === 'ready') return 100
  return 0
}

function formatWhen(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export default async function RepoPage({
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

  const isReady = repo.status === 'ready'

  // While indexing, show the live progress view.
  let initial: RepoStatusResponse | null = null
  if (!isReady) {
    const latestJob = await db.query.indexingJobs.findFirst({
      where: eq(indexingJobs.repoId, id),
      orderBy: desc(indexingJobs.startedAt),
    })
    initial = {
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
  }

  let chatSummaries: ChatSummary[] = []
  if (isReady) {
    const rows = await db
      .select({
        id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        messageCount: sql<number>`count(${messages.id})`,
        lastMessageAt: sql<string | null>`max(${messages.createdAt})`,
      })
      .from(chats)
      .leftJoin(messages, eq(messages.chatId, chats.id))
      .where(eq(chats.repoId, id))
      .groupBy(chats.id)
      .orderBy(desc(sql`max(${messages.createdAt})`), desc(chats.createdAt))

    chatSummaries = rows.map((r) => ({
      id: r.id,
      title: r.title,
      messageCount: Number(r.messageCount),
      lastMessageAt: r.lastMessageAt,
    }))
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

          {!isReady && initial ? (
            <RepoProgress initial={initial} />
          ) : (
            <>
              <section className="flex border-b py-8">
                <Stat value={String(repo.fileCount)} label="Files" />
                <div className="bg-border w-px self-stretch" />
                <Stat value={String(repo.chunkCount)} label="Chunks" />
                <div className="bg-border w-px self-stretch" />
                <Stat value={formatWhen(repo.indexedAt)} label="Indexed" />
              </section>
              <RepoOverview repoId={id} chats={chatSummaries} />
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-6 first:pl-0 last:pr-0">
      <p className="font-serif text-4xl leading-none">{value}</p>
      <p className="label-mark mt-2">{label}</p>
    </div>
  )
}
