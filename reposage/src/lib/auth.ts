import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type CurrentUser = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<CurrentUser> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated.");
  }

  const [user] = await db.select().from(users).where(eq(users.clerkId, userId));

  if (!user) {
    throw new Error("Authenticated user has not been synced.");
  }

  return user;
}
