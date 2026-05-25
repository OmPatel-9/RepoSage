import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  GitBranch,
  Layers,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

type Step = {
  num: string;
  title: string;
  tag: string;
  icon: LucideIcon;
  body: string;
  detail: string;
};

const steps: Step[] = [
  {
    num: "01",
    title: "Clone",
    tag: "github api",
    icon: GitBranch,
    body: "We grab the repo from GitHub and walk through all the files. Lockfiles, node_modules, build folders, and binaries get skipped automatically. You just get the real code.",
    detail:
      "Under 30 MB and 1,500 files per repo on the free tier. Anything bigger we ask you to trim down.",
  },
  {
    num: "02",
    title: "Chunk",
    tag: "tree-sitter",
    icon: Layers,
    body: "Instead of slicing code into random 300-line blocks like most RAG setups, we use tree-sitter to split it by actual functions and classes. Each chunk is a real thing the AI can reason about.",
    detail:
      "TypeScript, JavaScript, Python, and Go are AST-parsed. Other languages fall back to a smarter line-based chunker.",
  },
  {
    num: "03",
    title: "Embed",
    tag: "local bge-small",
    icon: Cpu,
    body: "Each chunk gets turned into a 384-dim vector by a model that runs on our own worker. No API keys, no rate limits, and your code never leaves the server. Vectors get stored in Postgres with pgvector.",
    detail:
      "Model is bge-small-en-v1.5 via @xenova/transformers. Around 120 MB in memory, batches 8 chunks at a time.",
  },
  {
    num: "04",
    title: "Query",
    tag: "groq · llama 70b",
    icon: MessageSquare,
    body: "When you ask something, we find the top 20 most relevant chunks, rerank them down to 6, and send those plus your question to Llama 3.3 70B on Groq. Answers stream back in 1 to 2 seconds with file citations.",
    detail:
      "Groq free tier is 1,000 requests per day. If we hit the cap, we fall back to Gemini Flash-Lite automatically.",
  },
];

export function HowPage() {
  return (
    <section className="relative px-6 py-20 md:px-8 md:py-28">
      <div className="absolute inset-0 veil-mid" />
      <div className="relative mx-auto max-w-6xl">
        <Link href="/" className="back-link mb-10">
          <ArrowLeft size={12} />
          Back to home
        </Link>

        <div className="label-mark mb-6">How it works</div>
        <h1
          className="rs-serif rs-fg mb-6"
          style={{ fontSize: "clamp(48px, 8vw, 112px)", lineHeight: 0.95 }}
        >
          Four steps. <em className="italic rs-accent">That is it.</em>
        </h1>
        <p
          className="rs-fg-dim mb-20 max-w-2xl"
          style={{ fontSize: "17px", lineHeight: 1.6 }}
        >
          Most code search tools do something fancy and never explain it. Here
          is exactly what happens between you pasting a GitHub URL and getting
          answers back.
        </p>

        <div className="space-y-px" style={{ background: "var(--border)" }}>
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div key={step.num} className="card-cell p-8 md:p-10">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-10">
                  <div className="md:col-span-3">
                    <div className="mb-6 flex items-center justify-between md:flex-col md:items-start md:gap-8">
                      <span className="rs-mono text-xs rs-fg-faint">
                        {step.num}
                      </span>
                      <Icon size={20} className="rs-accent" />
                    </div>
                    <div className="rs-mono text-xs rs-accent">
                      {step.tag}
                    </div>
                  </div>
                  <div className="md:col-span-9">
                    <h3
                      className="rs-serif rs-fg mb-4"
                      style={{
                        fontSize: "clamp(34px, 4vw, 52px)",
                        lineHeight: 1.05,
                      }}
                    >
                      {step.title}
                    </h3>
                    <p className="rs-fg mb-5 max-w-2xl text-[15px] leading-relaxed md:text-base">
                      {step.body}
                    </p>
                    <div
                      className="rs-mono max-w-2xl border-t pt-4 text-xs rs-fg-dim"
                      style={{
                        borderColor: "var(--border)",
                        lineHeight: 1.55,
                      }}
                    >
                      {step.detail}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="rs-fg-dim max-w-md text-[15px]">
            Want to see what comes out the other end?
          </p>
          <Link
            href="/preview"
            className="accent-button rs-mono flex items-center gap-2 rounded px-4 py-2.5 text-xs uppercase tracking-wider transition-all"
          >
            See the live preview
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
}
