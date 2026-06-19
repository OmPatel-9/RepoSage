import {
  HydrationBoundary,
  dehydrate,
  type QueryClient,
} from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * Server-side hydration helper. Prefetch into a request-scoped QueryClient
 * (from getQueryClient()), then wrap the subtree so the client picks up the
 * data without an extra fetch.
 */
export function HydrateClient({
  client,
  children,
}: {
  client: QueryClient
  children: ReactNode
}) {
  return (
    <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>
  )
}
