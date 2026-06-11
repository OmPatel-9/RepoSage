import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

const secret = z.string().trim().min(1)

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    GROQ_API_KEY: secret,
    GOOGLE_GENERATIVE_AI_API_KEY: secret,
    CLERK_SECRET_KEY: secret,
    CLERK_WEBHOOK_SECRET: secret,
    // Optional locally: rate limiting falls back to in-memory when absent.
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: secret.optional(),
    POSTHOG_KEY: secret,
    POSTHOG_HOST: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: secret,
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    POSTHOG_KEY: process.env.POSTHOG_KEY,
    POSTHOG_HOST: process.env.POSTHOG_HOST,
  },
  emptyStringAsUndefined: true,
})
