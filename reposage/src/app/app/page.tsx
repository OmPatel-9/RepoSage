export const dynamic = 'force-dynamic'

import { desc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'

import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'
import { db } from '@/db'
import { chats, repos } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { RepoIntakeForm } from '@/components/marketing/repo-intake-form'
import { DeleteRepoButton } from '@/components/delete-repo-button'

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
          <div className="border-b pb-8">
            <p className="label-mark mb-3">Dashboard</p>
            <h1 className="text-4xl font-semibold sm:text-5xl">
              Your{' '}
              <span className="font-serif font-normal italic">indexed</span>{' '}
              repos.
            </h1>
            <RepoIntakeForm />
          </div>

          {rows.length === 0 ? (
            <div className="py-20">
              <p className="font-serif text-2xl italic">No repos yet.</p>
              <p className="text-muted-foreground mt-3 font-mono text-xs">
                Use the form above to index your first repository.
              </p>
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
                    <DeleteRepoButton repoId={repo.id} />
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
