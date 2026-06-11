import { Show, UserButton } from '@clerk/nextjs'
import { BookOpenText } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'

export function SiteNav() {
  return (
    <header className="bg-background/85 border-b backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-md">
            <BookOpenText className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">RepoSage</p>
            <p className="text-muted-foreground font-mono text-xs">
              repository intelligence
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Badge variant="outline">Next 15 / React 19</Badge>

          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="text-foreground hover:text-muted-foreground font-mono text-xs tracking-[0.12em] uppercase"
            >
              Sign in
            </Link>
          </Show>

          <Show when="signed-in">
            <Link
              href="/app"
              className="text-foreground hover:text-muted-foreground font-mono text-xs tracking-[0.12em] uppercase"
            >
              Open app
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  )
}
