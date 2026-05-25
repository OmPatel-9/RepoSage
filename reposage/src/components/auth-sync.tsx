"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export function AuthSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }

    if (syncedUserId.current === user.id) {
      return;
    }

    syncedUserId.current = user.id;

    void fetch("/api/auth/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    }).catch(() => {
      syncedUserId.current = null;
    });
  }, [isLoaded, isSignedIn, user]);

  return null;
}
