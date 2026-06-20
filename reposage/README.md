# RepoSage App

This is the Next.js application for RepoSage.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui components
- `@t3-oss/env-nextjs` + Zod env validation
- Postgres with pgvector and Redis via Docker Compose
- Drizzle ORM with pgvector (HNSW index for cosine search)
- Clerk authentication with database sync via webhook

## Setup

```bash
corepack pnpm install
cp .env.example .env.local
docker compose up -d
corepack pnpm dev
```

Open http://localhost:3000.

## Commands

```bash
# development
corepack pnpm dev

# format
corepack pnpm format
corepack pnpm format:check

# lint and type-check
corepack pnpm lint
corepack pnpm exec tsc --noEmit

# production build
corepack pnpm build
```

## Local Services

```bash
docker compose up -d
docker compose down
```

Postgres runs on `localhost:5432` with database/user/password `reposage`.
Redis runs on `localhost:6379`.

## Database

```bash
corepack pnpm db:generate   # generate migrations from schema changes
corepack pnpm db:migrate    # apply pending migrations
corepack pnpm db:studio     # browse data
```

## Environment

Use `.env.example` as the template for `.env.local`. The `.env.local` file is
ignored by Git.

## Clerk Webhook

User rows are synced to Postgres by the Clerk webhook at
`/api/webhooks/clerk` (handles `user.created`, `user.updated`,
`user.deleted`).

In production, configure the webhook endpoint in the Clerk Dashboard
(Configure → Webhooks) to point at the deployed URL:

```
https://<your-deployment>/api/webhooks/clerk
```

Subscribe it to the `user.created`, `user.updated`, and `user.deleted`
events, then copy the signing secret into `CLERK_WEBHOOK_SECRET`.

For local testing, tunnel localhost and register the tunnel URL as a
webhook endpoint the same way.

## Evals

RepoSage ships a retrieval + answer-quality eval harness covering 30 golden
cases across three real-world repos (sindresorhus/is · colinhacks/zod ·
pallets/flask).

**Latest results** — run `pnpm evals:run` to generate:

| Metric             | Latest |
| ------------------ | ------ |
| Recall@5           | —      |
| Recall@10          | —      |
| Citation Precision | —      |
| Avg Answer Quality | —/5    |

```bash
# Run the full eval suite (first run indexes repos — ~20 min)
corepack pnpm evals:run
```

Reports land in `evals/results/YYYY-MM-DD.md`. See [`evals/README.md`](evals/README.md)
for metric definitions, how to add cases, and how to read the results.
