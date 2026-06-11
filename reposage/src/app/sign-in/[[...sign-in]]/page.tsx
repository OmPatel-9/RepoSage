import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <p className="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
        Access
      </p>
      <h1 className="mb-8 text-center text-4xl font-semibold">
        Welcome <span className="font-serif font-normal italic">back.</span>
      </h1>

      <SignIn />

      <p className="text-muted-foreground mt-8 font-mono text-xs">
        or{' '}
        <Link
          href="/sign-up"
          className="text-foreground underline underline-offset-4"
        >
          create an account
        </Link>
      </p>
    </main>
  )
}
