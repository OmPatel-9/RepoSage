import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  Search,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

type Feature = {
  num: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  body: string;
  detail: string;
};

const features: Feature[] = [
  {
    num: "01",
    icon: Search,
    title: "AST-aware retrieval",
    tagline: "Chunks that are actual things, not random lines.",
    body: "Most RAG systems split code into 300-line blocks. That is fine for blog posts but terrible for code, because a 300-line block almost never lines up with a function. We use tree-sitter to split by functions and classes, so when you ask about a function, the search returns the whole function.",
    detail:
      "On our eval set of 20 questions per repo, AST chunking improves recall@5 by about 30% over the naive approach.",
  },
  {
    num: "02",
    icon: FileText,
    title: "Citations you can click",
    tagline: "Every claim points to real code.",
    body: "When the AI says something happens in some file, it has to point to that file with line numbers. The prompt is set up so the model has to ground every claim, and we check the citations against real files before showing them to you. Made-up paths get filtered before they reach the UI.",
    detail:
      "The citation chips link to a file viewer with syntax highlighting. You can see exactly what the AI was looking at.",
  },
  {
    num: "03",
    icon: BookOpen,
    title: "Onboarding docs",
    tagline: "Hit a button, get a doc.",
    body: "New on a team and dropped into a 200-file Python service? Hit the generate button and we write a doc that explains the layout, the main entry points, and what each module does. It uses map-reduce: summarize each folder with a cheap model, then combine into a top-level overview with the smart one.",
    detail:
      "Takes around 50 LLM calls for a medium repo. Groq free tier handles that without breaking a sweat.",
  },
  {
    num: "04",
    icon: ShieldAlert,
    title: "Real bug finding",
    tagline: "Not the made-up kind.",
    body: "LLMs are bad at finding bugs in code they have never seen run. We do not pretend otherwise. semgrep does the actual static analysis with real rules, then the LLM explains each finding in plain English and proposes a fix. False positives get filtered hard, because three real issues are way more useful than thirty noisy ones.",
    detail:
      'Findings come with severity tags. You can review file by file or hit "review the whole repo" and get a list.',
  },
];

export function FeaturesPage() {
  return (
    <section className="relative px-6 py-20 md:px-8 md:py-28">
      <div className="absolute inset-0 veil-mid" />
      <div className="relative mx-auto max-w-6xl">
        <Link href="/" className="back-link mb-10">
          <ArrowLeft size={12} />
          Back to home
        </Link>

        <div className="label-mark mb-6">What it does</div>
        <h1
          className="rs-serif rs-fg mb-6"
          style={{ fontSize: "clamp(48px, 8vw, 112px)", lineHeight: 0.95 }}
        >
          Four things. <em className="italic rs-accent">All useful.</em>
        </h1>
        <p
          className="rs-fg-dim mb-20 max-w-2xl"
          style={{ fontSize: "17px", lineHeight: 1.6 }}
        >
          Lots of &quot;AI for code&quot; tools do a hundred things badly. We
          picked four things and made them actually work. Here is what each one
          is and why it is not BS.
        </p>

        <div className="space-y-12 md:space-y-16">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.num}
                className="grid grid-cols-1 gap-6 border-b pb-12 md:grid-cols-12 md:gap-10 md:pb-16"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="md:col-span-4">
                  <div className="mb-6 flex items-center gap-4">
                    <span className="rs-mono text-xs rs-fg-faint">
                      {feature.num}
                    </span>
                    <Icon size={20} className="rs-accent" />
                  </div>
                  <h3
                    className="rs-serif rs-fg mb-3"
                    style={{
                      fontSize: "clamp(32px, 4vw, 48px)",
                      lineHeight: 1.02,
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="rs-accent rs-mono text-xs italic"
                    style={{
                      fontFamily: "var(--font-instrument-serif)",
                      fontSize: "20px",
                      fontStyle: "italic",
                    }}
                  >
                    {feature.tagline}
                  </p>
                </div>
                <div className="md:col-span-8">
                  <p className="rs-fg mb-5 text-[16px] leading-relaxed">
                    {feature.body}
                  </p>
                  <div
                    className="rs-mono flex items-start gap-2 border-t pt-4 text-xs rs-fg-dim"
                    style={{
                      borderColor: "var(--border)",
                      lineHeight: 1.55,
                    }}
                  >
                    <Check
                      size={12}
                      className="mt-0.5 flex-shrink-0 rs-accent"
                    />
                    <span>{feature.detail}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="rs-fg-dim max-w-md text-[15px]">
            Want to see all this on a real repo?
          </p>
          <Link
            href="/preview"
            className="accent-button rs-mono flex items-center gap-2 rounded px-4 py-2.5 text-xs uppercase tracking-wider transition-all"
          >
            Open the demo
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
}
