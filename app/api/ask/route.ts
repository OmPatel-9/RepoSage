import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type GitHubRepo = {
  default_branch: string
  description: string | null
  full_name: string
  html_url: string
  language: string | null
  name: string
  stargazers_count: number
}

type GitTreeEntry = {
  path?: string
  sha?: string
  size?: number
  type?: "blob" | "tree"
  url?: string
}

type GitTreeResponse = {
  tree: GitTreeEntry[]
  truncated: boolean
}

type GitBlobResponse = {
  content: string
  encoding: string
  size: number
}

type RepoFile = {
  content: string
  htmlUrl: string
  path: string
  score: number
  size: number
}

type Snippet = {
  endLine: number
  htmlUrl: string
  path: string
  score: number
  startLine: number
  summary: string
  text: string
}

const MAX_FILES_TO_FETCH = 42
const MAX_FILE_SIZE = 70_000
const MAX_SNIPPETS = 6

const textExtensions = new Set([
  ".c",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".md",
  ".mdx",
  ".mjs",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svelte",
  ".toml",
  ".ts",
  ".tsx",
  ".vue",
  ".yaml",
  ".yml",
])

const blockedSegments = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".turbo",
  ".venv",
  ".vercel",
  "bin",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "obj",
  "out",
  "target",
  "vendor",
  "venv",
])

const blockedFileNames = new Set([
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
])

const intentKeywords: Record<string, string[]> = {
  auth: [
    "auth",
    "authenticate",
    "authenticated",
    "authorization",
    "clerk",
    "jwt",
    "login",
    "middleware",
    "oauth",
    "password",
    "session",
    "signin",
    "signup",
    "supabase",
    "token",
    "user",
  ],
  database: [
    "database",
    "db",
    "drizzle",
    "migration",
    "model",
    "pg",
    "postgres",
    "prisma",
    "schema",
    "sql",
    "supabase",
    "table",
  ],
  api: [
    "api",
    "controller",
    "endpoint",
    "handler",
    "route",
    "router",
    "server",
  ],
  ui: [
    "component",
    "css",
    "form",
    "page",
    "react",
    "style",
    "tailwind",
    "tsx",
    "ui",
    "view",
  ],
  tests: ["test", "spec", "jest", "vitest", "playwright", "cypress"],
}

function parseGitHubUrl(input: string) {
  let url: URL

  try {
    url = new URL(input)
  } catch {
    throw new Error("Enter a full GitHub URL like https://github.com/owner/repo.")
  }

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("Only public github.com repositories are supported right now.")
  }

  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean)
  const repo = rawRepo?.replace(/\.git$/, "")

  if (!owner || !repo) {
    throw new Error("Enter a GitHub repository URL with an owner and repo name.")
  }

  return { owner, repo }
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9_/.-]+/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2)
    )
  )
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RepoSage-local-mvp",
    "X-GitHub-Api-Version": "2022-11-28",
  }

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  return headers
}

async function fetchGitHub<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: githubHeaders(),
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "GitHub rate-limited this request. Add GITHUB_TOKEN to .env.local or try again later."
      )
    }

    if (response.status === 404) {
      throw new Error("That repository was not found, or it is not public.")
    }

    throw new Error(`GitHub request failed with status ${response.status}.`)
  }

  return response.json() as Promise<T>
}

function extensionOf(path: string) {
  const fileName = path.toLowerCase().split("/").pop() ?? ""
  const dotIndex = fileName.lastIndexOf(".")

  return dotIndex === -1 ? "" : fileName.slice(dotIndex)
}

function isReadableFile(entry: GitTreeEntry) {
  if (entry.type !== "blob" || !entry.path || !entry.url) return false
  if (entry.size && entry.size > MAX_FILE_SIZE) return false

  const lowerPath = entry.path.toLowerCase()
  const fileName = lowerPath.split("/").pop() ?? ""

  if (blockedFileNames.has(fileName) || fileName.endsWith(".lock")) {
    return false
  }

  if (lowerPath.split("/").some((segment) => blockedSegments.has(segment))) {
    return false
  }

  return (
    textExtensions.has(extensionOf(lowerPath)) ||
    fileName === "dockerfile" ||
    fileName === "license" ||
    fileName === "readme"
  )
}

function scorePath(path: string, questionTerms: string[]) {
  const lowerPath = path.toLowerCase()
  const fileName = lowerPath.split("/").pop() ?? lowerPath
  let score = 0

  for (const term of questionTerms) {
    if (lowerPath.includes(term)) score += 10
    if (fileName.includes(term)) score += 8
  }

  if (/readme|package\.json|pyproject|requirements|cargo\.toml|go\.mod/.test(fileName)) {
    score += 12
  }

  for (const keywords of Object.values(intentKeywords)) {
    if (questionTerms.some((term) => keywords.includes(term))) {
      for (const keyword of keywords) {
        if (lowerPath.includes(keyword)) score += 5
      }
    }
  }

  if (lowerPath.includes("src/") || lowerPath.includes("app/")) score += 2
  if (lowerPath.includes("test") || lowerPath.includes("spec")) score -= 4

  return score
}

function scoreContent(content: string, questionTerms: string[]) {
  const lowerContent = content.toLowerCase()
  let score = 0

  for (const term of questionTerms) {
    const matches = lowerContent.match(new RegExp(escapeRegExp(term), "g"))
    score += Math.min(matches?.length ?? 0, 12)
  }

  for (const keywords of Object.values(intentKeywords)) {
    if (questionTerms.some((term) => keywords.includes(term))) {
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword)) score += 2
      }
    }
  }

  return score
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function fetchRepoFile(entry: GitTreeEntry, repoHtmlUrl: string, branch: string) {
  if (!entry.url || !entry.path) return null

  const blob = await fetchGitHub<GitBlobResponse>(entry.url)
  if (blob.encoding !== "base64") return null

  const content = Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString(
    "utf8"
  )

  if (!content.trim() || content.includes("\u0000")) return null

  return {
    content,
    htmlUrl: `${repoHtmlUrl}/blob/${encodeURIComponent(branch)}/${entry.path}`,
    path: entry.path,
    score: 0,
    size: blob.size,
  } satisfies RepoFile
}

function findSnippets(file: RepoFile, questionTerms: string[]) {
  const lines = file.content.split(/\r?\n/)
  const lineScores = lines.map((line, index) => {
    const lowerLine = line.toLowerCase()
    let score = 0

    for (const term of questionTerms) {
      if (lowerLine.includes(term)) score += 7
    }

    if (/function|export|class|const|async|route|handler|middleware/i.test(line)) {
      score += 2
    }

    return { index, score }
  })

  return lineScores
    .filter((line) => line.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ index, score }) => {
      const start = Math.max(0, index - 3)
      const end = Math.min(lines.length - 1, index + 5)
      const snippetLines = lines
        .slice(start, end + 1)
        .map((line) => line.trimEnd())
        .filter(Boolean)

      return {
        endLine: end + 1,
        htmlUrl: `${file.htmlUrl}#L${start + 1}-L${end + 1}`,
        path: file.path,
        score: score + file.score,
        startLine: start + 1,
        summary: summarizeSnippet(file.path, snippetLines),
        text: snippetLines.join("\n").slice(0, 1200),
      } satisfies Snippet
    })
}

function summarizeSnippet(path: string, lines: string[]) {
  const compact = lines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("*"))
    .slice(0, 4)
    .join(" ")
    .replace(/\s+/g, " ")

  if (!compact) return `Relevant match in ${path}.`

  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact
}

function summarizePackageJson(content: string) {
  try {
    const packageJson = JSON.parse(content) as {
      dependencies?: Record<string, string>
      description?: string
      devDependencies?: Record<string, string>
      name?: string
      scripts?: Record<string, string>
    }

    const dependencies = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }).slice(0, 10)

    return [
      packageJson.name ? `The package is named "${packageJson.name}".` : "",
      packageJson.description ? packageJson.description : "",
      dependencies.length ? `Key dependencies include ${dependencies.join(", ")}.` : "",
      packageJson.scripts
        ? `Available scripts include ${Object.keys(packageJson.scripts)
            .slice(0, 8)
            .join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ")
  } catch {
    return ""
  }
}

function isOverviewQuestion(question: string) {
  return /what.*do|overview|summary|explain|architecture|purpose|about/i.test(question)
}

function buildAnswer({
  files,
  question,
  repo,
  snippets,
}: {
  files: RepoFile[]
  question: string
  repo: GitHubRepo
  snippets: Snippet[]
}) {
  if (!snippets.length) {
    if (isOverviewQuestion(question) && repo.description) {
      return `${repo.full_name}: ${repo.description} I scanned ${files.length} likely text/code files, but this repository did not expose enough matching text for line-level citations.`
    }

    return `I scanned ${files.length} files in ${repo.full_name}, but I did not find a strong match for "${question}". Try a more specific term like auth, API routes, database, tests, or config.`
  }

  const readme = files.find((file) => /(^|\/)readme\.md$/i.test(file.path))
  const packageJson = files.find((file) => /(^|\/)package\.json$/i.test(file.path))
  const citedPaths = snippets
    .slice(0, 3)
    .map((snippet) => `[${snippet.path}:${snippet.startLine}-${snippet.endLine}]`)
    .join(", ")

  if (isOverviewQuestion(question)) {
    const overviewParts = [
      repo.description ? `${repo.full_name}: ${repo.description}` : "",
      packageJson ? summarizePackageJson(packageJson.content) : "",
      readme
        ? `The README also points to ${readme.path} as the best high-level source.`
        : "",
    ].filter(Boolean)

    return `${overviewParts.join(" ")} The most relevant scanned files are ${citedPaths}.`
  }

  const primary = snippets[0]
  const next = snippets.slice(1, 4)

  return [
    `Based on the files I scanned, this is handled primarily in ${primary.path}:${primary.startLine}-${primary.endLine}. The matching code points to: ${primary.summary}`,
    next.length
      ? `Related evidence appears in ${next
          .map((snippet) => `${snippet.path}:${snippet.startLine}-${snippet.endLine}`)
          .join(", ")}.`
      : "",
    `I scanned ${files.length} likely text/code files from ${repo.full_name} and ranked matches against "${question}".`,
  ]
    .filter(Boolean)
    .join(" ")
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      question?: string
      repoUrl?: string
    }

    const repoUrl = body.repoUrl?.trim()
    const question = body.question?.trim()

    if (!repoUrl || !question) {
      return NextResponse.json(
        { error: "Repo URL and question are required." },
        { status: 400 }
      )
    }

    const { owner, repo: repoName } = parseGitHubUrl(repoUrl)
    const repo = await fetchGitHub<GitHubRepo>(
      `https://api.github.com/repos/${owner}/${repoName}`
    )
    const tree = await fetchGitHub<GitTreeResponse>(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/${encodeURIComponent(
        repo.default_branch
      )}?recursive=1`
    )
    const questionTerms = tokenize(question)
    const readableEntries = tree.tree
      .filter(isReadableFile)
      .map((entry) => ({
        ...entry,
        score: scorePath(entry.path ?? "", questionTerms),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_FILES_TO_FETCH)

    const files = (
      await Promise.all(
        readableEntries.map(async (entry) => {
          const file = await fetchRepoFile(entry, repo.html_url, repo.default_branch)
          if (!file) return null

          file.score = entry.score + scoreContent(file.content, questionTerms)
          return file
        })
      )
    )
      .filter((file): file is RepoFile => Boolean(file))
      .sort((a, b) => b.score - a.score)

    const snippets = files
      .flatMap((file) => findSnippets(file, questionTerms))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SNIPPETS)

    return NextResponse.json({
      answer: buildAnswer({ files, question, repo, snippets }),
      citations: snippets.map((snippet) => ({
        endLine: snippet.endLine,
        htmlUrl: snippet.htmlUrl,
        path: snippet.path,
        startLine: snippet.startLine,
        summary: snippet.summary,
      })),
      repo: {
        defaultBranch: repo.default_branch,
        description: repo.description,
        fileCount: readableEntries.length,
        fullName: repo.full_name,
        language: repo.language,
        scannedFiles: files.length,
        stars: repo.stargazers_count,
        truncated: tree.truncated,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while scanning this repository.",
      },
      { status: 400 }
    )
  }
}
