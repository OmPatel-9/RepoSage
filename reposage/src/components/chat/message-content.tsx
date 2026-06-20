'use client'

import ReactMarkdown from 'react-markdown'

import type { Citation } from '@/db/schema'

const CITATION_RE = /\[([^\]\s:]+):(\d+)-(\d+)\]/g

type Segment =
  | { type: 'text'; value: string }
  | { type: 'cite'; citation: Citation; label: string }

function splitSegments(text: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  for (const match of text.matchAll(CITATION_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) })
    }
    segments.push({
      type: 'cite',
      label: match[0],
      citation: {
        filePath: match[1] as string,
        startLine: Number(match[2]),
        endLine: Number(match[3]),
      },
    })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments
}

// Unwrap block elements so segments flow inline alongside citation chips.
const inlineComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}

export function MessageContent({
  content,
  onCite,
}: {
  content: string
  onCite: (citation: Citation) => void
}) {
  const segments = splitSegments(content)
  return (
    <div className="rs-prose text-sm leading-7">
      {segments.map((segment, i) =>
        segment.type === 'cite' ? (
          <button
            key={i}
            type="button"
            className="rs-citation"
            onClick={() => onCite(segment.citation)}
          >
            {segment.label}
          </button>
        ) : (
          <ReactMarkdown key={i} components={inlineComponents}>
            {segment.value}
          </ReactMarkdown>
        ),
      )}
    </div>
  )
}
