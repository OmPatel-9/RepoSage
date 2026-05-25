# RepoSage

RepoSage is an AI codebase reader that will index a repository, retrieve the most relevant source chunks, and answer developer questions with file citations.

## Tech Stack

- Next.js 15 with the App Router
- TypeScript
- Tailwind CSS v4
- Postgres 16 with pgvector
- Redis
- pnpm

## Run Locally

Install dependencies:

```bash
pnpm install
```

Start local infrastructure:

```bash
docker compose up -d
```

Start the Next.js dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local` and fill in the API keys when you are ready to connect LLM and auth providers. The local database and Redis URLs are already pointed at the services in `docker-compose.yml`.
