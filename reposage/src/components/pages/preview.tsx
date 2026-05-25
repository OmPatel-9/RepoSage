import {
  ArrowLeft,
  FileCode,
  Folder,
  GitBranch,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

type FileItem = {
  name: string;
  type: "folder" | "file";
  depth: number;
  active?: boolean;
};

const files: FileItem[] = [
  { name: "packages/", type: "folder", depth: 0 },
  { name: "next/", type: "folder", depth: 1 },
  { name: "src/", type: "folder", depth: 2 },
  { name: "server/", type: "folder", depth: 3 },
  { name: "app-render/", type: "folder", depth: 4 },
  { name: "error-boundary.tsx", type: "file", depth: 5, active: true },
  { name: "render-with-cache.tsx", type: "file", depth: 5 },
  { name: "route-matcher.ts", type: "file", depth: 5 },
  { name: "client/", type: "folder", depth: 3 },
  { name: "shared/", type: "folder", depth: 3 },
  { name: "react-dom/", type: "folder", depth: 1 },
  { name: "eslint-plugin-next/", type: "folder", depth: 1 },
];

const examples = [
  "where is auth handled?",
  "how does middleware work?",
  "show me the build pipeline",
  "find places that throw errors",
  "what does the router do?",
];

export function PreviewPage() {
  return (
    <section className="relative px-6 py-20 md:px-8 md:py-24">
      <div className="absolute inset-0 veil-light" />
      <div className="relative mx-auto max-w-7xl">
        <Link href="/" className="back-link mb-10">
          <ArrowLeft size={12} />
          Back to home
        </Link>

        <div className="label-mark mb-6">Live preview</div>
        <h1
          className="rs-serif rs-fg mb-6 max-w-4xl"
          style={{ fontSize: "clamp(44px, 7vw, 96px)", lineHeight: 0.96 }}
        >
          Chat with <em className="italic rs-accent">next.js</em> like it is a
          coworker.
        </h1>
        <p
          className="rs-fg-dim mb-12 max-w-2xl"
          style={{ fontSize: "17px", lineHeight: 1.6 }}
        >
          We indexed the Next.js repo (2,847 files) so you can see what
          answering a real question looks like. The cool part is the citations.
          You can verify every claim.
        </p>

        <div
          className="mb-12 overflow-hidden rounded-lg border shadow-2xl"
          style={{
            borderColor: "var(--border-strong)",
            background: "rgba(10, 10, 13, 0.94)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-alt)",
            }}
          >
            <div className="flex items-center gap-2">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
            <div className="rs-mono flex items-center gap-2 text-xs rs-fg-dim">
              <GitBranch size={10} />
              vercel / next.js · main
            </div>
            <div
              className="rs-mono flex items-center gap-1.5 text-xs"
              style={{ color: "var(--green)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full rs-pulse"
                style={{ background: "var(--green)" }}
              />
              indexed
            </div>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-12"
            style={{ minHeight: "560px" }}
          >
            <div
              className="border-b py-3 md:col-span-3 md:border-r md:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="rs-mono mb-3 px-4 text-xs uppercase tracking-wider rs-fg-faint"
                style={{ fontSize: "10px" }}
              >
                Files (2,847)
              </div>
              {files.map((file) => (
                <div
                  key={`${file.depth}-${file.name}`}
                  className={`file-row ${file.active ? "active" : ""}`}
                  style={{ paddingLeft: `${12 + file.depth * 11}px` }}
                >
                  {file.type === "folder" ? (
                    <Folder size={11} />
                  ) : (
                    <FileCode size={11} />
                  )}
                  <span>{file.name}</span>
                </div>
              ))}
              <div
                className="mt-3 border-t px-4 pt-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="rs-mono mb-2 uppercase tracking-wider rs-fg-faint"
                  style={{ fontSize: "10px" }}
                >
                  Cost
                </div>
                <div className="rs-mono text-xs rs-fg">
                  <span className="rs-accent">$0.00</span>
                  <span className="rs-fg-faint"> / session</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:col-span-9">
              <div className="flex-1 space-y-6 p-6 md:p-8">
                <div className="flex gap-3">
                  <div
                    className="rs-mono flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border rs-fg-dim"
                    style={{
                      borderColor: "var(--border-strong)",
                      background: "var(--bg-alt)",
                      fontSize: "10px",
                    }}
                  >
                    you
                  </div>
                  <div
                    className="flex-1 pt-1 text-sm rs-fg"
                    style={{ lineHeight: 1.6 }}
                  >
                    Where does the App Router handle render errors? I want to
                    understand the boundary logic before we ship our custom
                    error pages.
                  </div>
                </div>

                <div className="flex gap-3">
                  <div
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded"
                    style={{ background: "var(--accent)" }}
                  >
                    <Sparkles size={13} style={{ color: "var(--bg)" }} />
                  </div>
                  <div className="flex-1 space-y-3.5">
                    <div className="text-sm rs-fg" style={{ lineHeight: 1.65 }}>
                      App Router error handling has three layers. The top-level
                      boundary is set up in{" "}
                      <span className="citation">
                        <FileCode size={9} />
                        error-boundary.tsx:18-42
                      </span>
                      , which wraps the whole render tree and catches anything
                      thrown during server rendering.
                    </div>
                    <div className="text-sm rs-fg" style={{ lineHeight: 1.65 }}>
                      Per-segment{" "}
                      <span className="rs-mono rs-fg-dim">error.tsx</span>{" "}
                      files get detected during the build pass in{" "}
                      <span className="citation">
                        <FileCode size={9} />
                        route-matcher.ts:201-218
                      </span>
                      , then registered with the boundary at render time.
                    </div>
                    <div className="text-sm rs-fg" style={{ lineHeight: 1.65 }}>
                      The actual fallback rendering (what users see when
                      something throws) lives in{" "}
                      <span className="citation">
                        <FileCode size={9} />
                        render-with-cache.tsx:84-117
                      </span>
                      . Server and client errors take separate paths so
                      hydration mismatches do not blow up the whole tree.
                    </div>
                    <div
                      className="rs-mono mt-3 flex items-center gap-3 border-t pt-3 rs-fg-faint"
                      style={{
                        borderColor: "var(--border)",
                        fontSize: "11px",
                      }}
                    >
                      <span>3 sources</span>
                      <span>·</span>
                      <span>1.2s</span>
                      <span>·</span>
                      <span>llama-3.3-70b</span>
                      <span className="ml-auto rs-accent">view trace</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 opacity-50">
                  <div
                    className="rs-mono flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border rs-fg-dim"
                    style={{
                      borderColor: "var(--border-strong)",
                      background: "var(--bg-alt)",
                      fontSize: "10px",
                    }}
                  >
                    you
                  </div>
                  <div className="flex-1 pt-1 text-sm italic rs-fg-dim">
                    typing<span className="rs-blink rs-fg">_</span>
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-3 border-t p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="rs-mono text-sm rs-fg-dim">›</span>
                <input
                  type="text"
                  placeholder="Ask about the codebase..."
                  className="rs-mono flex-1 bg-transparent text-sm outline-none rs-fg"
                  style={{ caretColor: "var(--accent)" }}
                />
                <span className="rs-mono text-xs rs-fg-faint">⏎</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <div className="rs-mono mb-4 text-xs uppercase tracking-wider rs-fg-dim">
            Stuff people actually ask
          </div>
          <div className="flex flex-wrap gap-2.5">
            {examples.map((question) => (
              <button key={question} className="example-pill">
                <span className="rs-accent">›</span>
                {question}
              </button>
            ))}
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-8 border-t pt-12 md:grid-cols-12 md:gap-12"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="md:col-span-4">
            <div className="label-mark mb-4">The trick</div>
            <h2
              className="rs-serif rs-fg"
              style={{
                fontSize: "clamp(28px, 3vw, 40px)",
                lineHeight: 1.05,
              }}
            >
              Why the citations matter.
            </h2>
          </div>
          <div
            className="space-y-5 text-[15px] rs-fg md:col-span-8"
            style={{ lineHeight: 1.7 }}
          >
            <p>
              The thing to notice is that every claim has a file path with line
              numbers next to it. You can click any of those chips and jump
              straight to the code.
            </p>
            <p>
              This is the whole point. LLMs love to make stuff up, especially
              about code they kind of remember from training data. The prompt
              makes the model ground every statement in a real chunk from your
              repo, and we filter out any citations that do not match a real
              file before showing them to you.
            </p>
            <p className="rs-fg-dim">
              The result: if the answer is wrong, you can tell in two seconds.
              If it is right, you have receipts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
