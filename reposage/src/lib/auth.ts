import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { db } from '@/db'
import { users } from '@/db/schema'
import type { User } from '@/db/schema'

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Returns the current user's DB row.
 * Throws UnauthorizedError if not signed in or not yet synced via webhook.
 * Use in route handlers and server actions.
 */
export async function getCurrentUser(): Promise<User> {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    throw new UnauthorizedError()
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })
  if (!user) {
    throw new UnauthorizedError('User not found in database')
  }

  return user
}

/**
 * Like getCurrentUser, but redirects to /sign-in instead of throwing.
 * Use in Server Components.
 */
export async function requireUser(): Promise<User> {
  try {
    return await getCurrentUser()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-in')
    }
    throw error
  }
}
