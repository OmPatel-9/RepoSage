/**
 * RepoSage Eval Runner
 *
 * Usage: pnpm evals:run
 *
 * Requires the same .env.local as the main app (DATABASE_URL, GROQ_API_KEY,
 * GOOGLE_GENERATIVE_AI_API_KEY at minimum). Set SKIP_ENV_VALIDATION=1 if you
 * don't have Clerk/Posthog keys available in the eval environment.
 *
 * What it does:
 *   1. Ensures a system eval user exists in the DB.
 *   2. Indexes any repos in the dataset that aren't already indexed (caches by
 *      githubUrl + status='ready' so re-runs are fast).
 *   3. For each eval case:
 *        a. searchChunks(repoId, question, k=10) → recall@5, recall@10
 *        b. Full chat pipeline (search → assemble → complete) → response + citations
 *        c. citation_precision, expected_file_coverage
 *        d. LLM-as-judge (accuracy, completeness, conciseness, 1-5 each)
 *        e. Total latency tracked
 *   4. Writes a markdown report to evals/results/{YYYY-MM-DD}.md.
 */

// Must be the very first import so env vars are loaded before `../env` is
// evaluated and validates them.
import '../env-load'

import { eq, and, sql } from 'drizzle-orm'
import type { Job } from 'bullmq'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import pino from 'pino'
import { z } from 'zod'

import { db } from '../db'
import { repos, users } from '../db/schema'
import type { IndexRepoJob } from '../lib/queue/types'
import { searchChunks } from '../lib/retrieval/search'
import { assembleContext } from '../lib/retrieval/context'
import { buildChatSystemPrompt } from '../lib/prompts/chat'
import { complete } from '../lib/ai/client'
// Inline parseGithubUrl to avoid importing the full github module, which
// transitively loads octokit (incompatible with Node v24 ESM exports).
const OWNER_NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/
const REPO_NAME_RE = /^[A-Za-z0-9._-]+$/

function parseGithubUrl(input: string): { owner: string; name: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  let owner: string | undefined
  let name: string | undefined
  if (/^(https?:\/\/|git@|github\.com)/i.test(trimmed)) {
    const normalized = trimmed
      .replace(/^git@github\.com:/i, 'https://github.com/')
      .replace(/^github\.com\//i, 'https://github.com/')
    let url: URL
    try {
      url = new URL(normalized)
    } catch {
      return null
    }
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return null
    const parts = url.pathname.split('/').filter(Boolean)
    owner = parts[0]
    name = parts[1]
  } else {
    const parts = trimmed.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    owner = parts[0]
    name = parts[1]
  }
  if (!owner || !name) return null
  name = name.replace(/\.git$/i, '')
  if (!OWNER_NAME_RE.test(owner) || !REPO_NAME_RE.test(name)) return null
  return { owner, name }
}
import { handleIndexRepo } from '../worker/handlers/index-repo'
import { EVAL_CASES, EVAL_REPOS, type EvalCase } from './dataset'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EVAL_CLERK_ID = 'eval_system'
const EVAL_EMAIL = 'eval@reposage.internal'
const SEARCH_K = 10
const CONTEXT_MAX_TOKENS = 3000
const RESULTS_DIR = path.resolve(__dirname, '../../evals/results')
const CITATION_RE = /\[([^\]\s:]+(?:\/[^\]\s:]+)*):(\d+)-(\d+)\]/g

const log = pino({ level: 'info' }, pino.destination({ sync: true }))

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
const judgeSchema = z.object({
  accuracy: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe('How factually correct is the answer (1=wrong, 5=fully correct)'),
  completeness: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      'How completely does the answer address the question (1=missing key info, 5=thorough)',
    ),
  conciseness: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      'How concise and focused is the answer without unnecessary filler (1=verbose/off-topic, 5=tight)',
    ),
  reasoning: z.string().describe('1-2 sentences explaining the scores'),
})

type JudgeScore = z.infer<typeof judgeSchema>

interface CaseResult {
  id: string
  repo: string
  question: string
  recall5: number
  recall10: number
  citationPrecision: number
  expectedFileCoverage: number
  accuracy: number
  completeness: number
  conciseness: number
  judgeReasoning: string
  latencyMs: number
  error?: string
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function extractCitations(
  text: string,
): Array<{ filePath: string; startLine: number; endLine: number }> {
  const seen = new Set<string>()
  const out: Array<{ filePath: string; startLine: number; endLine: number }> =
    []
  for (const match of text.matchAll(CITATION_RE)) {
    const key = match[0]
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      filePath: match[1]!,
      startLine: Number(match[2]),
      endLine: Number(match[3]),
    })
  }
  return out
}

/** Returns the set of unique filePaths from the top-k search results. */
function filePathsInTopK(
  results: Awaited<ReturnType<typeof searchChunks>>,
  k: number,
): Set<string> {
  return new Set(results.slice(0, k).map((r) => r.filePath))
}

/**
 * recall@k = fraction of expectedFiles that appear in the top-k chunk results.
 * A file "appears" if any chunk with that filePath is in the top-k.
 */
function computeRecall(expected: string[], topK: Set<string>): number {
  if (expected.length === 0) return 1
  const hits = expected.filter((f) => topK.has(f)).length
  return hits / expected.length
}

/**
 * citation_precision = cited filePaths that exist in this repo's chunks / total unique citations.
 * We only check file-level existence (not line ranges) for efficiency.
 */
async function computeCitationPrecision(
  repoId: string,
  citations: Array<{ filePath: string }>,
): Promise<number> {
  if (citations.length === 0) return 1 // no citations → no wrong citations

  const uniquePaths = [...new Set(citations.map((c) => c.filePath))]
  let valid = 0
  for (const fp of uniquePaths) {
    const row = await db.execute(
      sql`SELECT 1 FROM chunks WHERE repo_id = ${repoId} AND file_path = ${fp} LIMIT 1`,
    )
    if ((row as unknown[]).length > 0) valid++
  }
  return valid / uniquePaths.length
}

/** expected_file_coverage = expectedFiles that appear in the response's citations / total expected. */
function computeExpectedFileCoverage(
  expected: string[],
  citations: Array<{ filePath: string }>,
): number {
  if (expected.length === 0) return 1
  const citedPaths = new Set(citations.map((c) => c.filePath))
  const hits = expected.filter((f) => citedPaths.has(f)).length
  return hits / expected.length
}

// ---------------------------------------------------------------------------
// Eval user setup
// ---------------------------------------------------------------------------
async function ensureEvalUser(): Promise<string> {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, EVAL_CLERK_ID),
  })
  if (existing) return existing.id

  const [created] = await db
    .insert(users)
    .values({ clerkId: EVAL_CLERK_ID, email: EVAL_EMAIL })
    .returning({ id: users.id })

  if (!created) throw new Error('Failed to create eval system user')
  log.info({ userId: created.id }, 'Created eval system user')
  return created.id
}

// ---------------------------------------------------------------------------
// Repo indexing with caching
// ---------------------------------------------------------------------------
async function ensureRepoIndexed(
  githubUrl: string,
  userId: string,
): Promise<string> {
  // Check for an already-ready repo
  const ready = await db.query.repos.findFirst({
    where: and(eq(repos.githubUrl, githubUrl), eq(repos.status, 'ready')),
  })
  if (ready) {
    log.info({ githubUrl, repoId: ready.id }, 'Repo already indexed — skipping')
    return ready.id
  }

  log.info({ githubUrl }, 'Indexing repo (this may take several minutes)…')

  const ref = parseGithubUrl(githubUrl)
  if (!ref) throw new Error(`Cannot parse GitHub URL: ${githubUrl}`)

  const [repo] = await db
    .insert(repos)
    .values({
      userId,
      githubUrl,
      owner: ref.owner,
      name: ref.name,
      defaultBranch: 'main',
      status: 'pending',
    })
    .returning({ id: repos.id })

  if (!repo) throw new Error(`Failed to create repo row for ${githubUrl}`)

  // Minimal BullMQ Job mock — handleIndexRepo only uses .data and .updateProgress
  const mockJob = {
    data: { repoId: repo.id },
    updateProgress: async (_n: number) => {
      /* no-op */
    },
  } as unknown as Job<IndexRepoJob['data']>

  await handleIndexRepo(mockJob, log)
  return repo.id
}

// ---------------------------------------------------------------------------
// LLM judge
// ---------------------------------------------------------------------------
async function judgeResponse(
  question: string,
  idealAnswer: string,
  response: string,
  userId: string,
): Promise<JudgeScore> {
  try {
    const result = await complete({
      userId,
      modelTier: 'smart',
      skipRateLimit: true,
      schema: judgeSchema,
      messages: [
        {
          role: 'user',
          content: `You are evaluating a code-assistant response against an ideal-answer rubric.

QUESTION:
${question}

IDEAL ANSWER RUBRIC:
${idealAnswer}

ACTUAL RESPONSE:
${response}

Score the response on three dimensions, each 1-5:
- accuracy: how factually correct is it relative to the rubric?
- completeness: does it cover all the key points in the rubric?
- conciseness: is it tight and focused without excessive padding?

Return your scores as JSON matching the schema.`,
        },
      ],
    })
    return result.object
  } catch (err) {
    log.warn({ err }, 'LLM judge failed, using default scores')
    return {
      accuracy: 0,
      completeness: 0,
      conciseness: 0,
      reasoning: 'judge error',
    }
  }
}

// ---------------------------------------------------------------------------
// Run a single eval case
// ---------------------------------------------------------------------------
async function runCase(
  evalCase: EvalCase,
  repoId: string,
  userId: string,
): Promise<CaseResult> {
  const { id, repo, question, expectedFiles, idealAnswer } = evalCase
  log.info({ id }, 'Running eval case')

  const start = Date.now()
  try {
    // ── 1. Vector search ───────────────────────────────────────────────────
    const searchResults = await searchChunks(repoId, question, SEARCH_K)

    const top5 = filePathsInTopK(searchResults, 5)
    const top10 = filePathsInTopK(searchResults, 10)
    const recall5 = computeRecall(expectedFiles, top5)
    const recall10 = computeRecall(expectedFiles, top10)

    // ── 2. Chat pipeline ───────────────────────────────────────────────────
    const { contextString } = assembleContext(searchResults, CONTEXT_MAX_TOKENS)
    const systemPrompt = buildChatSystemPrompt(contextString)

    const chatResult = await complete({
      userId,
      modelTier: 'smart',
      skipRateLimit: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    })
    const responseText = chatResult.text

    // ── 3. Citation metrics ────────────────────────────────────────────────
    const citations = extractCitations(responseText)
    const citationPrecision = await computeCitationPrecision(repoId, citations)
    const expectedFileCoverage = computeExpectedFileCoverage(
      expectedFiles,
      citations,
    )

    // ── 4. LLM judge ──────────────────────────────────────────────────────
    const judge = await judgeResponse(
      question,
      idealAnswer,
      responseText,
      userId,
    )

    const latencyMs = Date.now() - start

    return {
      id,
      repo,
      question,
      recall5,
      recall10,
      citationPrecision,
      expectedFileCoverage,
      accuracy: judge.accuracy,
      completeness: judge.completeness,
      conciseness: judge.conciseness,
      judgeReasoning: judge.reasoning,
      latencyMs,
    }
  } catch (err) {
    log.error({ id, err }, 'Eval case failed')
    return {
      id,
      repo,
      question,
      recall5: 0,
      recall10: 0,
      citationPrecision: 0,
      expectedFileCoverage: 0,
      accuracy: 0,
      completeness: 0,
      conciseness: 0,
      judgeReasoning: '',
      latencyMs: Date.now() - start,
      error: String(err),
    }
  }
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------
function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function p50p95(values: number[]): { p50: number; p95: number } {
  if (values.length === 0) return { p50: 0, p95: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]!
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!
  return { p50, p95 }
}

function repoShortName(url: string): string {
  return url.replace('https://github.com/', '')
}

function buildReport(results: CaseResult[], dateStr: string): string {
  const passed = results.filter((r) => !r.error)
  const failed = results.filter((r) => !!r.error)
  const failures = results.filter(
    (r) => r.recall5 === 0 || r.accuracy < 3 || r.completeness < 3,
  )

  const latencies = passed.map((r) => r.latencyMs)
  const { p50, p95 } = p50p95(latencies)

  const lines: string[] = []

  lines.push(`# RepoSage Eval Results — ${dateStr}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|--------|-------|')
  lines.push(`| Cases run | ${results.length} |`)
  lines.push(`| Cases errored | ${failed.length} |`)
  lines.push(`| Avg Recall@5 | ${pct(avg(passed.map((r) => r.recall5)))} |`)
  lines.push(`| Avg Recall@10 | ${pct(avg(passed.map((r) => r.recall10)))} |`)
  lines.push(
    `| Avg Citation Precision | ${pct(avg(passed.map((r) => r.citationPrecision)))} |`,
  )
  lines.push(
    `| Avg Expected File Coverage | ${pct(avg(passed.map((r) => r.expectedFileCoverage)))} |`,
  )
  lines.push(
    `| Avg Accuracy (1-5) | ${avg(passed.map((r) => r.accuracy)).toFixed(2)} |`,
  )
  lines.push(
    `| Avg Completeness (1-5) | ${avg(passed.map((r) => r.completeness)).toFixed(2)} |`,
  )
  lines.push(
    `| Avg Conciseness (1-5) | ${avg(passed.map((r) => r.conciseness)).toFixed(2)} |`,
  )
  lines.push(`| Latency p50 | ${p50}ms |`)
  lines.push(`| Latency p95 | ${p95}ms |`)
  lines.push('')

  // Per-repo breakdown
  const repoUrls = [...new Set(results.map((r) => r.repo))]
  for (const repoUrl of repoUrls) {
    const repoCases = passed.filter((r) => r.repo === repoUrl)
    if (repoCases.length === 0) continue
    lines.push(`### ${repoShortName(repoUrl)}`)
    lines.push('')
    lines.push(
      `Avg Recall@5: ${pct(avg(repoCases.map((r) => r.recall5)))} · ` +
        `Recall@10: ${pct(avg(repoCases.map((r) => r.recall10)))} · ` +
        `Citation Precision: ${pct(avg(repoCases.map((r) => r.citationPrecision)))} · ` +
        `Coverage: ${pct(avg(repoCases.map((r) => r.expectedFileCoverage)))} · ` +
        `Quality: ${avg(repoCases.map((r) => (r.accuracy + r.completeness + r.conciseness) / 3)).toFixed(2)}/5`,
    )
    lines.push('')
  }

  // Per-case table
  lines.push('## Per-Case Results')
  lines.push('')
  lines.push(
    '| ID | Repo | R@5 | R@10 | Cit.Prec | Coverage | Acc | Comp | Conc | Latency | Error |',
  )
  lines.push(
    '|----|------|-----|------|----------|----------|-----|------|------|---------|-------|',
  )
  for (const r of results) {
    const repoName = repoShortName(r.repo)
    lines.push(
      `| ${r.id} | ${repoName} | ${pct(r.recall5)} | ${pct(r.recall10)} | ${pct(r.citationPrecision)} | ${pct(r.expectedFileCoverage)} | ${r.accuracy} | ${r.completeness} | ${r.conciseness} | ${r.latencyMs}ms | ${r.error ? '❌' : ''} |`,
    )
  }
  lines.push('')

  // Failures section
  if (failures.length > 0) {
    lines.push('## Failures (Recall@5 = 0 or Judge Score < 3)')
    lines.push('')
    for (const r of failures) {
      lines.push(`### ${r.id} — ${repoShortName(r.repo)}`)
      lines.push('')
      lines.push(`**Question:** ${r.question}`)
      lines.push('')
      lines.push(
        `**Recall@5:** ${pct(r.recall5)} · **Accuracy:** ${r.accuracy} · **Completeness:** ${r.completeness}`,
      )
      if (r.judgeReasoning) {
        lines.push('')
        lines.push(`**Judge:** ${r.judgeReasoning}`)
      }
      if (r.error) {
        lines.push('')
        lines.push(`**Error:** \`${r.error}\``)
      }
      lines.push('')
    }
  }

  if (failed.length > 0) {
    lines.push('## Errored Cases')
    lines.push('')
    for (const r of failed) {
      lines.push(`- **${r.id}**: \`${r.error}\``)
    }
    lines.push('')
  }

  lines.push(`---`)
  lines.push(`_Generated by \`pnpm evals:run\` on ${dateStr}_`)

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  log.info('RepoSage eval runner starting')

  // 1. System user
  const userId = await ensureEvalUser()
  log.info({ userId }, 'Eval user ready')

  // 2. Index repos (with caching)
  const repoIdMap = new Map<string, string>()
  for (const repoUrl of EVAL_REPOS) {
    try {
      const repoId = await ensureRepoIndexed(repoUrl, userId)
      repoIdMap.set(repoUrl, repoId)
    } catch (err) {
      log.error(
        { repoUrl, err },
        'Failed to index repo — cases for this repo will be skipped',
      )
    }
  }

  // 3. Run eval cases
  const results: CaseResult[] = []
  for (const evalCase of EVAL_CASES) {
    const repoId = repoIdMap.get(evalCase.repo)
    if (!repoId) {
      log.warn({ id: evalCase.id }, 'Repo not indexed, skipping case')
      results.push({
        id: evalCase.id,
        repo: evalCase.repo,
        question: evalCase.question,
        recall5: 0,
        recall10: 0,
        citationPrecision: 0,
        expectedFileCoverage: 0,
        accuracy: 0,
        completeness: 0,
        conciseness: 0,
        judgeReasoning: '',
        latencyMs: 0,
        error: 'Repo not indexed',
      })
      continue
    }
    const result = await runCase(evalCase, repoId, userId)
    results.push(result)
    log.info(
      {
        id: result.id,
        recall5: result.recall5.toFixed(2),
        accuracy: result.accuracy,
        latencyMs: result.latencyMs,
      },
      'Case complete',
    )
  }

  // 4. Write report
  const dateStr = new Date().toISOString().slice(0, 10)
  mkdirSync(RESULTS_DIR, { recursive: true })
  const reportPath = path.join(RESULTS_DIR, `${dateStr}.md`)
  const report = buildReport(results, dateStr)
  writeFileSync(reportPath, report, 'utf8')
  log.info({ reportPath }, 'Eval report written')

  // 5. Print summary to stdout
  const passed = results.filter((r) => !r.error)
  console.log('\n=== EVAL SUMMARY ===')
  console.log(
    `Cases: ${results.length} (${results.filter((r) => r.error).length} errors)`,
  )
  console.log(
    `Avg Recall@5:    ${(avg(passed.map((r) => r.recall5)) * 100).toFixed(1)}%`,
  )
  console.log(
    `Avg Recall@10:   ${(avg(passed.map((r) => r.recall10)) * 100).toFixed(1)}%`,
  )
  console.log(
    `Avg Cit.Prec:    ${(avg(passed.map((r) => r.citationPrecision)) * 100).toFixed(1)}%`,
  )
  console.log(
    `Avg Accuracy:    ${avg(passed.map((r) => r.accuracy)).toFixed(2)}/5`,
  )
  console.log(
    `Avg Completeness:${avg(passed.map((r) => r.completeness)).toFixed(2)}/5`,
  )
  console.log(`Report: ${reportPath}`)

  process.exit(0)
}

main().catch((err) => {
  log.error({ err }, 'Eval runner failed')
  process.exit(1)
})
