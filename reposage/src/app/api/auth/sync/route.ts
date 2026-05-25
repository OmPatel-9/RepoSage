import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function POST() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null;

  const [user] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email,
      },
    })
    .returning();

  return NextResponse.json({ user });
}
