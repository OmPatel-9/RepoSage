import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Chapter {
  number: string
  title: string
  body: string
}

const chapters: Chapter[] = [
  {
    number: '01',
    title: 'Clone',
    body: 'Point RepoSage at a public or connected private repository.',
  },
  {
    number: '02',
    title: 'Map',
    body: 'Every file is parsed into an AST-aware symbol and dependency graph.',
  },
  {
    number: '03',
    title: 'Index',
    body: 'Code chunks are embedded into pgvector behind an HNSW index.',
  },
  {
    number: '04',
    title: 'Review',
    body: 'Policy passes flag security, maintainability, and onboarding gaps.',
  },
]

interface Desk {
  title: string
  body: string
}

const desks: Desk[] = [
  {
    title: 'Map',
    body: 'A dependency map you can actually read, organized by architecture instead of directory depth.',
  },
  {
    title: 'Review',
    body: 'Security, maintainability, and onboarding checks that share one source graph.',
  },
  {
    title: 'Ask',
    body: 'Architecture questions answered with citations to files, commits, and symbols. Evidence over theater.',
  },
]

export function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="border-b py-20 sm:py-28">
        <p className="text-muted-foreground mb-5 font-mono text-xs tracking-[0.18em] uppercase">
          Repository intelligence
        </p>
        <h1 className="max-w-3xl text-5xl leading-tight font-semibold text-balance sm:text-6xl">
          Read a repository like a field guide,
          <span className="font-serif font-normal italic">
            {' '}
            not a file tree.
          </span>
        </h1>
        <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
          Paste a repo URL, build the dependency map, and turn architecture
          questions into traceable answers.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Link
            href="/sign-up"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-5 py-3 font-mono text-xs tracking-[0.12em] uppercase"
          >
            Start reading
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/sign-in"
            className="text-foreground hover:text-muted-foreground font-mono text-xs tracking-[0.12em] uppercase underline underline-offset-4"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="grid border-b sm:grid-cols-3">
        {desks.map((desk) => (
          <div
            key={desk.title}
            className="border-b py-10 last:border-b-0 sm:border-r sm:border-b-0 sm:px-8 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              <span className="font-serif font-normal italic">
                {desk.title}
              </span>
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              {desk.body}
            </p>
          </div>
        ))}
      </section>

      <section className="py-16">
        <p className="text-muted-foreground mb-8 font-mono text-xs tracking-[0.18em] uppercase">
          How a run unfolds
        </p>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {chapters.map((chapter) => (
            <li key={chapter.number} className="border-t pt-4">
              <p className="text-muted-foreground font-mono text-xs">
                {chapter.number}
              </p>
              <h3 className="mt-2 mb-2 text-lg font-semibold">
                {chapter.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-6">
                {chapter.body}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
