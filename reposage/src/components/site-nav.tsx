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
        <Badge variant="outline">Next 15 / React 19</Badge>
      </div>
    </header>
  )
}
