import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { isBinaryFile } from 'isbinaryfile'

export interface WalkedFile {
  filePath: string
  language: string
  sizeBytes: number
  lineCount: number
}

/** Files larger than this are skipped (likely generated/vendored). */
const MAX_FILE_BYTES = 200 * 1024

/** Directories we never descend into. */
const IGNORED_DIRS = new Set<string>([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  'target',
  'vendor',
  '.venv',
  '__pycache__',
])

const IGNORED_FILENAMES = new Set<string>([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
])

/** Binary / non-code extensions to skip outright. */
const IGNORED_EXTENSIONS = new Set<string>([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.bmp',
  '.tiff',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.pdf',
  '.zip',
  '.gz',
  '.tar',
  '.tgz',
  '.rar',
  '.7z',
])

const EXTENSION_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.css': 'css',
  '.scss': 'css',
  '.html': 'html',
  '.htm': 'html',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
}

function detectLanguage(filePath: string): string {
  return EXTENSION_LANGUAGE[path.extname(filePath).toLowerCase()] ?? 'text'
}

function isIgnoredFile(name: string): boolean {
  if (IGNORED_FILENAMES.has(name)) return true
  if (name.endsWith('.lock')) return true
  if (name.endsWith('.min.js')) return true
  if (name.endsWith('.map')) return true
  if (name.endsWith('.tar.gz')) return true
  return IGNORED_EXTENSIONS.has(path.extname(name).toLowerCase())
}

function countLines(content: Buffer): number {
  if (content.length === 0) return 0
  let lines = 1
  for (let i = 0; i < content.length; i++) {
    if (content[i] === 0x0a) lines++
  }
  return lines
}

/**
 * Recursively walks a local repository checkout and returns indexable text
 * files. Skips ignored directories, dotfiles, binaries, and files over 200 KB.
 * Uses native fs (no glob dependency) so it runs cleanly under tsx/Node ESM.
 */
export async function walkRepo(localPath: string): Promise<WalkedFile[]> {
  const results: WalkedFile[] = []

  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      // Skip dotfiles/dotdirs (matches the previous dot:false behaviour).
      if (entry.name.startsWith('.')) continue

      const absolutePath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        await walk(absolutePath)
        continue
      }
      if (!entry.isFile()) continue
      if (isIgnoredFile(entry.name)) continue

      let sizeBytes: number
      try {
        sizeBytes = (await stat(absolutePath)).size
      } catch {
        continue
      }
      if (sizeBytes > MAX_FILE_BYTES) continue

      let content: Buffer
      try {
        content = await readFile(absolutePath)
      } catch {
        continue
      }
      if (await isBinaryFile(content)) continue

      const relativePath = path
        .relative(localPath, absolutePath)
        .split(path.sep)
        .join('/')

      results.push({
        filePath: relativePath,
        language: detectLanguage(entry.name),
        sizeBytes,
        lineCount: countLines(content),
      })
    }
  }

  await walk(localPath)
  return results
}
