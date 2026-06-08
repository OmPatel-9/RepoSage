# RepoSage

RepoSage is a repository intelligence workbench built with Next.js 15, React 19,
TypeScript, Tailwind CSS v4, shadcn/ui, Postgres with pgvector, and Redis.

The app lives in [`reposage/`](./reposage).

## Quick Start

```bash
cd reposage
corepack pnpm install
cp .env.example .env.local
docker compose up -d
corepack pnpm dev
```

Open http://localhost:3000.

## Common Commands

```bash
cd reposage

# start local services
docker compose up -d

# run the app
corepack pnpm dev

# format, lint, and type-check
corepack pnpm format
corepack pnpm lint
corepack pnpm exec tsc --noEmit

# production build
corepack pnpm build
```

## Environment

Copy `reposage/.env.example` to `reposage/.env.local` and fill in real secrets
before connecting third-party services.

Required keys are validated in `reposage/src/env.ts`.
