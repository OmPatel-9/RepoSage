'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DeleteRepoButton({ repoId }: { repoId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault() // don't navigate via the parent <Link>
    e.stopPropagation()

    if (!confirming) {
      setConfirming(true)
      // Auto-cancel confirmation after 3 s
      setTimeout(() => setConfirming(false), 3000)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/repos/${repoId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const body = (await res.json()) as { error?: string }
        alert(body.error ?? 'Delete failed.')
        setLoading(false)
        setConfirming(false)
      }
    } catch {
      alert('Network error — please try again.')
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title={confirming ? 'Click again to confirm' : 'Delete repo'}
      className={`shrink-0 rounded p-1.5 transition-colors ${
        confirming
          ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
          : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
      } disabled:opacity-40`}
    >
      {loading ? (
        <span className="font-mono text-[10px]">…</span>
      ) : confirming ? (
        <span className="font-mono text-[10px] tracking-wide">confirm?</span>
      ) : (
        <Trash2 className="size-3.5" />
      )}
    </button>
  )
}
