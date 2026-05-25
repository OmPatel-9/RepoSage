import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type StackLayer = {
  tag: string;
  layer: string;
  name: string;
  tier: string;
  note: string;
};

const layers: StackLayer[] = [
  {
    tag: "LLM",
    layer: "Inference",
    name: "Groq · Llama 3.3 70B",
    tier: "1,000 req / day · free",
    note: "Fast and free up to 1k requests daily. Llama 3.1 8B (14k/day) handles the bulk stuff.",
  },
  {
    tag: "AI",
    layer: "Embeddings",
    name: "bge-small-en-v1.5",
    tier: "local · unlimited",
    note: "Runs on our own worker via @xenova/transformers. No API calls. No rate limits.",
  },
  {
    tag: "DB",
    layer: "Vectors",
    name: "Supabase + pgvector",
    tier: "500 MB · free",
    note: "HNSW index for fast retrieval. 500 MB fits a lot of repos at 384-dim.",
  },
  {
    tag: "INFRA",
    layer: "Queue",
    name: "Upstash Redis + BullMQ",
    tier: "500K cmd / mo · free",
    note: "Background job processing for indexing. BullMQ has rate limiting built in.",
  },
  {
    tag: "TOOL",
    layer: "Static analysis",
    name: "semgrep",
    tier: "OSS · free",
    note: "Real static analysis rules. We use the default rulesets and filter aggressively.",
  },
  {
    tag: "WEB",
    layer: "Frontend",
    name: "Next.js on Vercel",
    tier: "hobby · free",
    note: "Vercel hobby tier is generous. Cold starts are fast.",
  },
  {
    tag: "COMPUTE",
    layer: "Worker",
    name: "Render / Fly.io",
    tier: "free tier",
    note: "Separate worker process for indexing. Has cold starts but a health check ping keeps it warm.",
  },
  {
    tag: "AUTH",
    layer: "Identity",
    name: "Clerk",
    tier: "10K MAU · free",
    note: "10,000 monthly active users on free. We will never hit that.",
  },
];

export function StackPage() {
  return (
    <section className="relative px-6 py-20 md:px-8 md:py-28">
      <div className="absolute inset-0 veil-mid" />
      <div className="relative mx-auto max-w-6xl">
        <Link href="/" className="back-link mb-10">
          <ArrowLeft size={12} />
          Back to home
        </Link>

        <div className="label-mark mb-6">The stack</div>
        <h1
          className="rs-serif rs-fg mb-6"
          style={{ fontSize: "clamp(48px, 8vw, 112px)", lineHeight: 0.95 }}
        >
          Built on <em className="italic rs-accent">free stuff.</em>
        </h1>
        <p
          className="rs-fg-dim mb-20 max-w-2xl"
          style={{ fontSize: "17px", lineHeight: 1.6 }}
        >
          Every piece of this is a free tier or open source. Here is what we
          use and what each thing is for. The bill at the end is zero.
        </p>

        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          {layers.map((item) => (
            <div
              key={`${item.tag}-${item.layer}`}
              className="stack-row -mx-4 border-b px-4 py-7"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="grid grid-cols-12 items-baseline gap-4">
                <div
                  className="rs-mono col-span-3 uppercase tracking-wider rs-fg-faint md:col-span-2"
                  style={{ fontSize: "10px" }}
                >
                  {item.tag}
                </div>
                <div className="rs-mono col-span-9 text-xs rs-fg-dim md:col-span-3 md:text-sm">
                  {item.layer}
                </div>
                <div
                  className="rs-serif rs-fg col-span-12 mt-1 md:col-span-4 md:mt-0"
                  style={{ fontSize: "clamp(22px, 2vw, 28px)" }}
                >
                  {item.name}
                </div>
                <div className="rs-mono col-span-12 mt-1 text-left text-xs rs-accent md:col-span-3 md:mt-0 md:text-right">
                  {item.tier}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-12">
                <div
                  className="col-span-12 text-sm rs-fg-dim md:col-start-6 md:col-span-7"
                  style={{ lineHeight: 1.55 }}
                >
                  {item.note}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="my-24 text-center">
          <div className="rs-mono mb-4 text-xs rs-fg-dim">
            Monthly bill at portfolio scale
          </div>
          <div
            className="rs-serif rs-accent"
            style={{ fontSize: "clamp(96px, 14vw, 200px)", lineHeight: 1 }}
          >
            $0<span className="rs-fg-faint">.00</span>
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-8 border-t pt-12 md:grid-cols-12 md:gap-12"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="md:col-span-4">
            <div className="label-mark mb-4">What if</div>
            <h2
              className="rs-serif rs-fg"
              style={{
                fontSize: "clamp(28px, 3vw, 40px)",
                lineHeight: 1.05,
              }}
            >
              What if it actually gets users?
            </h2>
          </div>
          <div
            className="space-y-5 text-[15px] rs-fg md:col-span-8"
            style={{ lineHeight: 1.7 }}
          >
            <p>
              Groq&apos;s paid tier is about 60 cents per million input tokens
              for Llama 3.3 70B. So if a thousand people use it daily and each
              asks 5 questions, you are looking at maybe $20 a month. Not
              exactly scary.
            </p>
            <p>
              Supabase paid tier kicks in at $25 once you outgrow 500 MB.
              Vercel and Upstash both have generous middle tiers. The most
              expensive piece is probably the worker if you outgrow
              Render&apos;s free tier (around $7 for the next bump up).
            </p>
            <p className="rs-fg-dim">
              For a portfolio project though, $0 is the move. The point of
              building it on free stuff is showing you can architect things
              efficiently, not that you can burn through credits.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
