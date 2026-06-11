import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <p className="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
        Access
      </p>
      <h1 className="mb-8 text-center text-4xl font-semibold">
        Start <span className="font-serif font-normal italic">reading.</span>
      </h1>

      <SignUp />

      <p className="text-muted-foreground mt-8 font-mono text-xs">
        or{' '}
        <Link
          href="/sign-in"
          className="text-foreground underline underline-offset-4"
        >
          sign in instead
        </Link>
      </p>
    </main>
  )
}
