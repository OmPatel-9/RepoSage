'use client'

import { useAuth } from '@clerk/nextjs'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// Inner component: identify the Clerk user once the session is ready.
// ---------------------------------------------------------------------------
function PostHogIdentifier() {
  const { userId } = useAuth()

  useEffect(() => {
    if (!posthog.__loaded) return
    if (userId) {
      posthog.identify(userId)
    } else {
      posthog.reset()
    }
  }, [userId])

  return null
}

// ---------------------------------------------------------------------------
// Provider: initialises posthog-js once, wraps the tree.
// ---------------------------------------------------------------------------
interface PostHogProviderProps {
  apiKey: string
  apiHost: string
  children: React.ReactNode
}

export function PostHogProvider({
  apiKey,
  apiHost,
  children,
}: PostHogProviderProps) {
  useEffect(() => {
    if (posthog.__loaded) return // already initialised
    posthog.init(apiKey, {
      api_host: apiHost,
      // Capture page-views automatically on route change.
      capture_pageview: false, // we call capturePageview manually below
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    })
  }, [apiKey, apiHost])

  return (
    <PHProvider client={posthog}>
      <PostHogIdentifier />
      {children}
    </PHProvider>
  )
}
