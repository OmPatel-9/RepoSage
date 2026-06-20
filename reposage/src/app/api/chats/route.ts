import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { chats, repos } from '@/db/schema'
import { getCurrentUser, UnauthorizedError } from '@/lib/auth'

const createSchema = z.object({
  repoId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await getCurrentUser()
    const body: unknown = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }

    // Ensure the repo belongs to the user before creating a chat under it.
    const repo = await db.query.repos.findFirst({
      where: and(eq(repos.id, parsed.data.repoId), eq(repos.userId, user.id)),
    })
    if (!repo) {
      return Response.json({ error: 'Repo not found.' }, { status: 404 })
    }

    const [chat] = await db
      .insert(chats)
      .values({
        repoId: parsed.data.repoId,
        userId: user.id,
        title: parsed.data.title ?? 'New conversation',
      })
      .returning({ id: chats.id })

    return Response.json({ chatId: chat?.id })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    console.error('chats POST failed:', error)
    return Response.json({ error: 'Could not create chat.' }, { status: 500 })
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    const user = await getCurrentUser()
    const repoId = new URL(req.url).searchParams.get('repoId')

    const where = repoId
      ? and(eq(chats.userId, user.id), eq(chats.repoId, repoId))
      : eq(chats.userId, user.id)

    const rows = await db.query.chats.findMany({
      where,
      orderBy: desc(chats.createdAt),
    })

    return Response.json({ chats: rows })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Sign in required.' }, { status: 401 })
    }
    console.error('chats GET failed:', error)
    return Response.json({ error: 'Could not list chats.' }, { status: 500 })
  }
}
