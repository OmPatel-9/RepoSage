import { desc, eq, sql } from 'drizzle-orm'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'
import { db } from '@/db'
import { chats, repos } from '@/db/schema'
import { requireUser } from '@/lib/auth'

function formatWhen(date: Date | null): string {
  if (!date) return 'not indexed'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function statusDotClass(status: string): string {
  if (status === 'ready') return 'bg-accent'
  if (status === 'failed') return 'bg-destructive'
  return 'bg-[var(--rs-amber)]'
}

export default async function DashboardPage() {
  const user = await requireUser()

  const rows = await db
    .select({
      id: repos.id,
      owner: repos.owner,
      name: repos.name,
      status: repos.status,
      fileCount: repos.fileCount,
      indexedAt: repos.indexedAt,
      createdAt: repos.createdAt,
      chatCount: sql<number>`count(${chats.id})`,
    })
    .from(repos)
    .leftJoin(chats, eq(chats.repoId, repos.id))
    .where(eq(repos.userId, user.id))
    .groupBy(repos.id)
    .orderBy(desc(repos.createdAt))

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between border-b pb-8">
            <div>
              <p className="label-mark mb-3">Dashboard</p>
              <h1 className="text-4xl font-semibold sm:text-5xl">
                Your{' '}
                <span className="font-serif font-normal italic">indexed</span>{' '}
                repos.
              </h1>
            </div>
            <Link
              href="/"
              className="hover:border-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2.5 font-mono text-xs tracking-[0.12em] uppercase"
            >
              Index a new repo
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="py-20">
              <p className="font-serif text-2xl italic">No repos yet.</p>
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground mt-3 inline-block font-mono text-xs underline underline-offset-4"
              >
                Drop a GitHub URL on the home page to get started.
              </Link>
            </div>
          ) : (
            <ul>
              {rows.map((repo, index) => (
                <li key={repo.id}>
                  <Link
                    href={`/app/repos/${repo.id}`}
                    className="hover:bg-card/40 flex items-center gap-6 border-b py-6 transition-colors"
                  >
                    <span className="text-muted-foreground w-8 shrink-0 font-mono text-sm">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-2xl">
                        <span className="text-muted-foreground">
                          {repo.owner}/
                        </span>
                        {repo.name}
                      </p>
                      <p className="text-muted-foreground mt-1 font-mono text-xs">
                        {repo.fileCount} files · {Number(repo.chatCount)} chats
                        · {formatWhen(repo.indexedAt)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 font-mono text-xs tracking-wide uppercase">
                      <span
                        className={`size-2 rounded-full ${statusDotClass(repo.status)}`}
                      />
                      {repo.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
