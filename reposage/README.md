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

## Environment

Use `.env.example` as the template for `.env.local`. The `.env.local` file is
ignored by Git.
