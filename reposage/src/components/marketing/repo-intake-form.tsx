'use client'

import { useAuth } from '@clerk/nextjs'
import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'

import { indexRepoAction } from '@/lib/actions/index-repo'
import type { IndexRepoState } from '@/lib/actions/index-repo'

const initialState: IndexRepoState = { ok: false }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-md px-5 py-3 font-mono text-xs tracking-[0.12em] uppercase disabled:opacity-60"
    >
      {pending ? 'Indexing' : 'Index'}
      {pending ? (
        <span className="rs-blink" aria-hidden />
      ) : (
        <ArrowRight className="size-4" />
      )}
    </button>
  )
}

export function RepoIntakeForm() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const [state, formAction] = useActionState(indexRepoAction, initialState)

  useEffect(() => {
    if (state.ok && state.repoId) {
      router.push(`/app/repos/${state.repoId}`)
      return
    }
    if (!state.error) return

    if (state.code === 'auth') {
      router.push('/sign-in')
      return
    }
    toast(
      state.code === 'rate-limit' ? 'Rate limit reached' : 'Could not index',
      { description: state.error },
    )
  }, [state, router])

  return (
    <form action={formAction} className="mt-10 max-w-2xl">
      <p className="label-mark mb-3">Index a repository</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="githubUrl"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="github.com/owner/name"
          className="bg-card/60 focus:border-foreground flex-1 rounded-md border px-4 py-3 font-mono text-sm outline-none"
          onFocus={() => {
            if (isSignedIn === false) router.push('/sign-in')
          }}
        />
        <SubmitButton />
      </div>
      {state.error && state.code !== 'auth' ? (
        <p className="text-destructive mt-3 font-mono text-xs">{state.error}</p>
      ) : null}
    </form>
  )
}
