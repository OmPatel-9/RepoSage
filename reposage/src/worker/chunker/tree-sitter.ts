import { createRequire } from 'node:module'

import { Language, Parser, type Node } from 'web-tree-sitter'

const require = createRequire(import.meta.url)

export interface RawChunk {
  symbolName: string | null
  startLine: number
  endLine: number
  content: string
}

/** Languages this chunker can parse. Everything else falls back to lines. */
export type AstLanguage = 'typescript' | 'javascript' | 'python' | 'go'

const AST_LANGUAGES = new Set<AstLanguage>([
  'typescript',
  'javascript',
  'python',
  'go',
])

export function isAstLanguage(language: string): language is AstLanguage {
  return AST_LANGUAGES.has(language as AstLanguage)
}

/** Resolve a grammar wasm file shipped inside its npm package. */
function grammarWasm(pkg: string, file: string): string {
  return require.resolve(`${pkg}/${file}`)
}

// Maps a logical grammar key to its wasm location.
const GRAMMAR_WASM: Record<string, () => string> = {
  typescript: () =>
    grammarWasm('tree-sitter-typescript', 'tree-sitter-typescript.wasm'),
  tsx: () => grammarWasm('tree-sitter-typescript', 'tree-sitter-tsx.wasm'),
  javascript: () =>
    grammarWasm('tree-sitter-javascript', 'tree-sitter-javascript.wasm'),
  python: () => grammarWasm('tree-sitter-python', 'tree-sitter-python.wasm'),
  go: () => grammarWasm('tree-sitter-go', 'tree-sitter-go.wasm'),
}

let initPromise: Promise<void> | null = null
const languageCache = new Map<string, Language>()

/** Initialise the web-tree-sitter runtime exactly once per process. */
async function ensureInit(): Promise<void> {
  initPromise ??= Parser.init({
    locateFile: (file: string) => require.resolve(`web-tree-sitter/${file}`),
  })
  await initPromise
}

async function loadLanguage(key: string): Promise<Language> {
  const cached = languageCache.get(key)
  if (cached) return cached
  const loader = GRAMMAR_WASM[key]
  if (!loader) throw new Error(`No grammar for ${key}`)
  const lang = await Language.load(loader())
  languageCache.set(key, lang)
  return lang
}

/** Pick the grammar key for a language + file path (handles tsx/jsx). */
function grammarKey(language: AstLanguage, filePath: string): string {
  if (language === 'typescript') {
    return filePath.endsWith('.tsx') ? 'tsx' : 'typescript'
  }
  return language
}

// Node types that become their own chunk, per grammar family.
const CHUNK_NODE_TYPES: Record<AstLanguage, Set<string>> = {
  typescript: new Set([
    'function_declaration',
    'generator_function_declaration',
    'class_declaration',
    'abstract_class_declaration',
    'method_definition',
  ]),
  javascript: new Set([
    'function_declaration',
    'generator_function_declaration',
    'class_declaration',
    'method_definition',
  ]),
  python: new Set([
    'function_definition',
    'class_definition',
    'decorated_definition',
  ]),
  go: new Set([
    'function_declaration',
    'method_declaration',
    'type_declaration',
  ]),
}

// Nodes we descend through transparently (wrappers around declarations).
const CONTAINER_NODE_TYPES = new Set([
  'program',
  'module',
  'source_file',
  'export_statement',
  'export',
  'statement_block',
])

const ARROW_VALUE_TYPES = new Set([
  'arrow_function',
  'function',
  'function_expression',
])

function declarationHasFunction(node: Node): boolean {
  for (const declarator of node.namedChildren) {
    if (!declarator || declarator.type !== 'variable_declarator') continue
    const value = declarator.childForFieldName('value')
    if (value && ARROW_VALUE_TYPES.has(value.type)) return true
  }
  return false
}

function symbolName(node: Node, language: AstLanguage): string | null {
  const direct = node.childForFieldName('name')
  if (direct) return direct.text

  if (
    node.type === 'lexical_declaration' ||
    node.type === 'variable_declaration'
  ) {
    for (const declarator of node.namedChildren) {
      if (declarator?.type === 'variable_declarator') {
        return declarator.childForFieldName('name')?.text ?? null
      }
    }
  }
  if (language === 'python' && node.type === 'decorated_definition') {
    const def =
      node.childForFieldName('definition') ?? node.namedChildren.at(-1) ?? null
    return def?.childForFieldName('name')?.text ?? null
  }
  if (language === 'go' && node.type === 'type_declaration') {
    for (const spec of node.namedChildren) {
      if (spec?.type === 'type_spec') {
        return spec.childForFieldName('name')?.text ?? null
      }
    }
  }
  return null
}

function isChunkNode(node: Node, language: AstLanguage): boolean {
  if (CHUNK_NODE_TYPES[language].has(node.type)) return true
  // Arrow/function assigned to a const/let/var.
  if (
    (language === 'typescript' || language === 'javascript') &&
    (node.type === 'lexical_declaration' ||
      node.type === 'variable_declaration')
  ) {
    return declarationHasFunction(node)
  }
  return false
}

/** Split a chunk longer than 100 lines into 80-line slices, 10-line overlap. */
function splitLargeChunk(chunk: RawChunk, lines: string[]): RawChunk[] {
  const total = chunk.endLine - chunk.startLine + 1
  if (total <= 100) return [chunk]

  const out: RawChunk[] = []
  const sliceSize = 80
  const overlap = 10
  let start = chunk.startLine // 1-based
  let part = 1
  while (start <= chunk.endLine) {
    const end = Math.min(start + sliceSize - 1, chunk.endLine)
    out.push({
      symbolName: chunk.symbolName ? `${chunk.symbolName}#${part}` : null,
      startLine: start,
      endLine: end,
      content: lines.slice(start - 1, end).join('\n'),
    })
    if (end >= chunk.endLine) break
    start = end - overlap + 1
    part++
  }
  return out
}

/**
 * Parse a file and extract symbol-level chunks. Falls back to a single
 * whole-file chunk when no declarations are found (e.g. import/type-only).
 * Throws if the grammar can't load — callers should fall back to lines.
 */
export async function chunkWithAst(
  filePath: string,
  content: string,
  language: AstLanguage,
): Promise<RawChunk[]> {
  await ensureInit()
  const lang = await loadLanguage(grammarKey(language, filePath))
  const parser = new Parser()
  parser.setLanguage(lang)

  const tree = parser.parse(content)
  const lines = content.split('\n')
  const collected: RawChunk[] = []

  if (tree) {
    const visit = (node: Node): void => {
      for (const child of node.namedChildren) {
        if (!child) continue
        if (isChunkNode(child, language)) {
          const raw: RawChunk = {
            symbolName: symbolName(child, language),
            startLine: child.startPosition.row + 1,
            endLine: child.endPosition.row + 1,
            content: child.text,
          }
          collected.push(...splitLargeChunk(raw, lines))
        } else if (CONTAINER_NODE_TYPES.has(child.type)) {
          visit(child)
        }
      }
    }
    visit(tree.rootNode)
    tree.delete()
  }

  parser.delete()

  if (collected.length === 0) {
    return [
      {
        symbolName: null,
        startLine: 1,
        endLine: lines.length,
        content,
      },
    ]
  }
  return collected
}
