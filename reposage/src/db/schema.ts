import { sql } from 'drizzle-orm'
import {
  bigint,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * pgvector column. Produces `vector(384)` in SQL (384 = all-MiniLM-L6-v2
 * embedding dimensions) and round-trips Float32Array through pgvector's
 * `[0.1,0.2,...]` text representation.
 */
const vector384 = customType<{ data: Float32Array; driverData: string }>({
  dataType() {
    return 'vector(384)'
  },
  toDriver(value: Float32Array): string {
    return `[${Array.from(value).join(',')}]`
  },
  fromDriver(value: string): Float32Array {
    return new Float32Array(JSON.parse(value) as number[])
  },
})

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Citation {
  filePath: string
  startLine: number
  endLine: number
  chunkId?: string
}

const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)

export const users = pgTable('users', {
  id: id(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const repos = pgTable('repos', {
  id: id(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  githubUrl: text('github_url').notNull(),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  defaultBranch: text('default_branch').default('main').notNull(),
  commitSha: text('commit_sha'),
  fileCount: integer('file_count').default(0).notNull(),
  chunkCount: integer('chunk_count').default(0).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).default(0).notNull(),
  status: text('status').default('pending').notNull(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  indexedAt: timestamp('indexed_at', { withTimezone: true }),
})

export const indexingJobs = pgTable('indexing_jobs', {
  id: id(),
  repoId: uuid('repo_id')
    .references(() => repos.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').default('pending').notNull(),
  progress: integer('progress').default(0).notNull(),
  currentStep: text('current_step'),
  logs: text('logs')
    .array()
    .default(sql`'{}'::text[]`)
    .notNull(),
  startedAt: timestamp('started_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
})

export const chunks = pgTable(
  'chunks',
  {
    id: id(),
    repoId: uuid('repo_id')
      .references(() => repos.id, { onDelete: 'cascade' })
      .notNull(),
    filePath: text('file_path').notNull(),
    language: text('language').notNull(),
    symbolName: text('symbol_name'),
    startLine: integer('start_line').notNull(),
    endLine: integer('end_line').notNull(),
    content: text('content').notNull(),
    embedding: vector384('embedding'),
    tokenCount: integer('token_count').notNull(),
  },
  (table) => [
    index('chunks_repo_id_idx').on(table.repoId),
    index('chunks_embedding_hnsw_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
)

export const chats = pgTable('chats', {
  id: id(),
  repoId: uuid('repo_id')
    .references(() => repos.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const messages = pgTable(
  'messages',
  {
    id: id(),
    chatId: uuid('chat_id')
      .references(() => chats.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').$type<MessageRole>().notNull(),
    content: text('content').notNull(),
    citations: jsonb('citations').$type<Citation[]>(),
    model: text('model'),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('messages_chat_id_idx').on(table.chatId)],
)

export const apiUsage = pgTable('api_usage', {
  id: id(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const generatedDocs = pgTable('generated_docs', {
  id: id(),
  repoId: uuid('repo_id')
    .references(() => repos.id, { onDelete: 'cascade' })
    .notNull(),
  markdown: text('markdown').notNull(),
  modelUsed: text('model_used').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type User = typeof users.$inferSelect
export type Repo = typeof repos.$inferSelect
export type IndexingJob = typeof indexingJobs.$inferSelect
export type Chunk = typeof chunks.$inferSelect
export type Chat = typeof chats.$inferSelect
export type Message = typeof messages.$inferSelect
export type ApiUsageRow = typeof apiUsage.$inferSelect
export type GeneratedDoc = typeof generatedDocs.$inferSelect
