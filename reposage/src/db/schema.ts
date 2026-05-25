import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export type Citation = {
  file_path: string;
  start_line: number;
  end_line: number;
};

const id = uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = timestamp("created_at").notNull().defaultNow();

export const users = pgTable("users", {
  id,
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email"),
  createdAt,
});

export const repos = pgTable(
  "repos",
  {
    id,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    githubUrl: text("github_url").notNull(),
    owner: text("owner"),
    name: text("name"),
    defaultBranch: text("default_branch"),
    commitSha: text("commit_sha"),
    fileCount: integer("file_count").notNull().default(0),
    chunkCount: integer("chunk_count").notNull().default(0),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    createdAt,
    indexedAt: timestamp("indexed_at"),
  },
  (table) => [
    check(
      "repos_status_check",
      sql`${table.status} in ('pending', 'cloning', 'chunking', 'embedding', 'ready', 'failed')`,
    ),
  ],
);

export const indexingJobs = pgTable(
  "indexing_jobs",
  {
    id,
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repos.id),
    status: text("status").notNull(),
    progress: integer("progress").notNull().default(0),
    currentStep: text("current_step"),
    logs: text("logs").array().notNull().default(sql`'{}'::text[]`),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    check(
      "indexing_jobs_progress_check",
      sql`${table.progress} >= 0 and ${table.progress} <= 100`,
    ),
  ],
);

export const chunks = pgTable(
  "chunks",
  {
    id,
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repos.id),
    filePath: text("file_path").notNull(),
    language: text("language"),
    symbolName: text("symbol_name"),
    startLine: integer("start_line").notNull(),
    endLine: integer("end_line").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 384 }).notNull(),
    tokenCount: integer("token_count").notNull(),
  },
  (table) => [index("chunks_repo_id_idx").on(table.repoId)],
);

export const chats = pgTable("chats", {
  id,
  repoId: uuid("repo_id")
    .notNull()
    .references(() => repos.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title"),
  createdAt,
});

export const messages = pgTable(
  "messages",
  {
    id,
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id),
    role: text("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations").$type<Citation[] | null>(),
    model: text("model"),
    latencyMs: integer("latency_ms"),
    createdAt,
  },
  (table) => [
    index("messages_chat_id_idx").on(table.chatId),
    check("messages_role_check", sql`${table.role} in ('user', 'assistant', 'system')`),
  ],
);

export const apiUsage = pgTable("api_usage", {
  id,
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt,
});
