import type { Job } from 'bullmq'
import { asc, eq } from 'drizzle-orm'
import type { Logger } from 'pino'
import { z } from 'zod'

import { db } from '../../db'
import { chunks, generatedDocs, repos } from '../../db/schema'
import { complete } from '../../lib/ai/client'
import type { GenerateDocJob } from '../../lib/queue/types'

const folderSchema = z.object({
  folderPath: z.string(),
  purpose: z.string().describe('1-2 sentence summary of what this folder does'),
  keyFiles: z.array(z.object({ path: z.string(), role: z.string() })).max(5),
})

const docSchema = z.object({
  overview: z.string(),
  architecture: z.array(
    z.object({ folder: z.string(), description: z.string() }),
  ),
  entryPoints: z.array(z.object({ file: z.string(), purpose: z.string() })),
  howToRun: z.string(),
  tips: z.array(z.string()),
})

type FolderSummary = z.infer<typeof folderSchema>
type Doc = z.infer<typeof docSchema>

/** Top-level folder for a path, or '(root)' for files at the repo root. */
function topFolder(filePath: string): string {
  const slash = filePath.indexOf('/')
  return slash === -1 ? '(root)' : filePath.slice(0, slash)
}

/** Build a bounded context string for one folder's chunks. */
function folderContext(
  rows: { filePath: string; symbolName: string | null; content: string }[],
): string {
  const MAX_CHARS = 6000
  const parts: string[] = []
  let used = 0
  for (const row of rows) {
    const header = `// ${row.filePath}${row.symbolName ? ` — ${row.symbolName}` : ''}`
    const block = `${header}\n${row.content}\n`
    if (used + block.length > MAX_CHARS) {
      parts.push(header)
      continue
    }
    parts.push(block)
    used += block.length
  }
  return parts.join('\n')
}

function renderMarkdown(doc: Doc, repoName: string): string {
  const lines: string[] = []
  lines.push(`# ${repoName}`)
  lines.push('')
  lines.push(doc.overview)
  lines.push('')

  lines.push('## Architecture')
  lines.push('')
  for (const item of doc.architecture) {
    lines.push(`- **${item.folder}** — ${item.description}`)
  }
  lines.push('')

  lines.push('## Entry points')
  lines.push('')
  for (const entry of doc.entryPoints) {
    lines.push(`- \`${entry.file}\` — ${entry.purpose}`)
  }
  lines.push('')

  lines.push('## How to run')
  lines.push('')
  lines.push(doc.howToRun)
  lines.push('')

  lines.push('## Tips')
  lines.push('')
  for (const tip of doc.tips) {
    lines.push(`- ${tip}`)
  }
  lines.push('')

  return lines.join('\n')
}

/**
 * Generates an onboarding document for a repo: summarises each top-level
 * folder with the fast model, then composes a structured doc with the smart
 * model and stores it as markdown. Both LLM calls use typed Zod schemas.
 */
export async function handleGenerateDoc(
  job: Job<GenerateDocJob['data']>,
  log: Logger,
): Promise<{ repoId: string; generated: boolean }> {
  const { repoId } = job.data
  await job.updateProgress(5)

  const repo = await db.query.repos.findFirst({ where: eq(repos.id, repoId) })
  if (!repo) throw new Error(`Repo ${repoId} not found`)

  const allChunks = await db.query.chunks.findMany({
    where: eq(chunks.repoId, repoId),
    orderBy: asc(chunks.filePath),
  })
  if (allChunks.length === 0) {
    throw new Error('Repo has no indexed chunks; cannot generate a doc.')
  }

  // Group chunks by top-level folder.
  const byFolder = new Map<
    string,
    { filePath: string; symbolName: string | null; content: string }[]
  >()
  for (const chunk of allChunks) {
    const folder = topFolder(chunk.filePath)
    const list = byFolder.get(folder) ?? []
    list.push({
      filePath: chunk.filePath,
      symbolName: chunk.symbolName,
      content: chunk.content,
    })
    byFolder.set(folder, list)
  }

  const folders = [...byFolder.keys()]
  const summaries: FolderSummary[] = []

  log.info(
    { repoId, folders: folders.length },
    'generate-doc: summarising folders',
  )

  let done = 0
  for (const folder of folders) {
    const rows = byFolder.get(folder) ?? []
    try {
      const { object } = await complete({
        userId: repo.userId,
        skipRateLimit: true,
        modelTier: 'fast',
        schema: folderSchema,
        system:
          'You summarise a single folder of a codebase from the provided code. Be concise and concrete. Only reference files that appear in the input.',
        messages: [
          {
            role: 'user',
            content: `Folder: ${folder}\n\nCode:\n${folderContext(rows)}`,
          },
        ],
      })
      summaries.push(object)
    } catch (error) {
      log.warn(
        { repoId, folder, err: error },
        'generate-doc: folder summary failed',
      )
      summaries.push({
        folderPath: folder,
        purpose: 'Summary unavailable.',
        keyFiles: [],
      })
    }
    done++
    // Folder phase spans progress 5 -> 70.
    await job.updateProgress(5 + Math.floor((done / folders.length) * 65))
  }

  log.info({ repoId }, 'generate-doc: composing document')
  await job.updateProgress(75)

  const summaryText = summaries
    .map(
      (s) =>
        `### ${s.folderPath}\nPurpose: ${s.purpose}\nKey files:\n${s.keyFiles
          .map((f) => `- ${f.path}: ${f.role}`)
          .join('\n')}`,
    )
    .join('\n\n')

  const { object: doc, model } = await complete({
    userId: repo.userId,
    skipRateLimit: true,
    modelTier: 'smart',
    schema: docSchema,
    system:
      'You write a concise onboarding guide for a new engineer joining a codebase. Use only the folder summaries provided. Be specific and practical. Do not invent files or commands you cannot infer.',
    messages: [
      {
        role: 'user',
        content: `Repository: ${repo.owner}/${repo.name}\nDefault branch: ${repo.defaultBranch}\n\nFolder summaries:\n${summaryText}`,
      },
    ],
  })

  await job.updateProgress(95)

  const markdown = renderMarkdown(doc, `${repo.owner}/${repo.name}`)
  await db.insert(generatedDocs).values({ repoId, markdown, modelUsed: model })

  await job.updateProgress(100)
  log.info({ repoId }, 'generate-doc: done')
  return { repoId, generated: true }
}
