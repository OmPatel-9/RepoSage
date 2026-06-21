import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <p className="text-muted-foreground mb-4 font-mono text-xs tracking-[0.18em] uppercase">
        Repository intelligence
      </p>
      <h1 className="max-w-2xl text-5xl font-semibold tracking-tight sm:text-6xl">
        RepoSage <span className="font-serif font-normal italic">AI</span>
      </h1>
      <p className="text-muted-foreground mt-6 max-w-md text-lg leading-7">
        Paste a GitHub URL, get a fully indexed, searchable codebase you can ask
        anything about — with cited answers grounded in the actual source.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/sign-up"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-6 py-3 font-mono text-xs tracking-[0.12em] uppercase"
        >
          Get started
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/sign-in"
          className="text-foreground hover:text-muted-foreground font-mono text-xs tracking-[0.12em] uppercase underline underline-offset-4"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
