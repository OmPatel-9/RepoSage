import { auth, currentUser } from '@clerk/nextjs/server'
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
 *
 * If the user exists in Clerk but not in the DB (e.g. the webhook hasn't
 * fired yet in local dev), we auto-create the row here so the app doesn't
 * get stuck in a redirect loop. The webhook handler remains the canonical
 * sync path in production; this is just a safety net.
 */
export async function getCurrentUser(): Promise<User> {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    throw new UnauthorizedError()
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })
  if (existing) return existing

  // DB row missing — fetch from Clerk and upsert.
  const clerkUser = await currentUser()
  if (!clerkUser) throw new UnauthorizedError()

  const email =
    clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress

  if (!email) throw new UnauthorizedError('No email on Clerk account')

  const [created] = await db
    .insert(users)
    .values({ clerkId, email })
    .onConflictDoUpdate({ target: users.clerkId, set: { email } })
    .returning()

  if (!created) throw new UnauthorizedError('Failed to create user row')
  return created
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
