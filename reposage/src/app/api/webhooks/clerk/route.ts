import type { WebhookEvent } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { Webhook } from 'svix'

import { db } from '@/db'
import { users } from '@/db/schema'
import { env } from '@/env'

function primaryEmail(data: {
  email_addresses?: { id: string; email_address: string }[]
  primary_email_address_id?: string | null
}): string | null {
  const addresses = data.email_addresses ?? []
  const primary = addresses.find((a) => a.id === data.primary_email_address_id)
  return primary?.email_address ?? addresses[0]?.email_address ?? null
}

export async function POST(req: Request): Promise<Response> {
  const headerStore = await headers()
  const svixId = headerStore.get('svix-id')
  const svixTimestamp = headerStore.get('svix-timestamp')
  const svixSignature = headerStore.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.text()

  let event: WebhookEvent
  try {
    const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET)
    event = webhook.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'user.created':
    case 'user.updated': {
      const email = primaryEmail(event.data)
      if (!email) {
        return new Response('User has no email address', { status: 400 })
      }
      await db
        .insert(users)
        .values({ clerkId: event.data.id, email })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: { email },
        })
      break
    }
    case 'user.deleted': {
      if (event.data.id) {
        await db.delete(users).where(eq(users.clerkId, event.data.id))
      }
      break
    }
    default:
      // Ignore event types we don't handle.
      break
  }

  return new Response('OK', { status: 200 })
}
