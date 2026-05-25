"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Search,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import Link from "next/link";

type TopicHref = "/how" | "/features" | "/preview" | "/stack";

type Topic = {
  href: TopicHref;
  num: string;
  title: string;
  blurb: string;
  element: ReactNode;
  cta: string;
};

export function HomePage() {
  const [url, setUrl] = useState("");

  const topics: Topic[] = [
    {
      href: "/how",
      num: "01",
      title: "How it works",
      blurb:
        "The pipeline. Clone, chunk, embed, query. Four steps that take a repo from URL to chat.",
      element: (
        <div className="rs-mono flex items-center gap-2 text-xs rs-fg-faint">
          <span>01</span>
          <span>02</span>
          <span>03</span>
          <span className="rs-accent">04</span>
        </div>
      ),
      cta: "See the pipeline",
    },
    {
      href: "/features",
      num: "02",
      title: "What it does",
      blurb:
        "Four things, done well. Chat with citations, onboarding docs, and bug finding that is actually useful.",
      element: (
        <div className="flex items-center gap-4 rs-fg-dim">
          <Search size={16} />
          <FileText size={16} />
          <BookOpen size={16} />
          <ShieldAlert size={16} />
        </div>
      ),
      cta: "See the features",
    },
    {
      href: "/preview",
      num: "03",
      title: "Live preview",
      blurb:
        "What it looks like to chat with the Next.js codebase. Real questions, real file citations.",
      element: (
        <div className="rs-mono flex items-center gap-2 truncate text-xs rs-fg-dim">
          <span className="rs-accent">›</span>
          <span>where is auth handled?</span>
        </div>
      ),
      cta: "See the demo",
    },
    {
      href: "/stack",
      num: "04",
      title: "The stack",
      blurb:
        "Built on Groq, pgvector, local embeddings, and a bunch of free tiers. Monthly bill is zero.",
      element: (
        <div className="rs-serif text-3xl rs-accent">
          $0<span className="rs-fg-faint">.00</span>
        </div>
      ),
      cta: "See the stack",
    },
  ];

  return (
    <>
      <section className="relative px-6 pb-20 pt-10 md:px-8 md:pb-28 md:pt-16">
        <div className="max-w-6xl">
          <div className="rs-fade-up label-mark mb-10">
            AI codebase reader
          </div>

          <h1
            className="rs-fade-up rs-serif rs-fg mb-10"
            style={{
              fontSize: "clamp(54px, 9vw, 144px)",
              lineHeight: 0.92,
              animationDelay: "0.1s",
            }}
          >
            Talk to <em className="italic rs-accent">any</em>
            <br />
            GitHub repo.
          </h1>

          <p
            className="rs-fade-up rs-fg-dim mb-10 max-w-xl"
            style={{
              fontSize: "17px",
              lineHeight: 1.65,
              animationDelay: "0.2s",
            }}
          >
            Paste a link and we read the whole codebase for you. Ask it
            questions, find bugs, write onboarding docs. Free to run.
          </p>

          <div
            className="rs-fade-up input-terminal mb-5 flex max-w-2xl items-center gap-3 rounded-md px-4 py-3"
            style={{ animationDelay: "0.3s" }}
          >
            <Terminal size={15} className="flex-shrink-0 rs-fg-dim" />
            <span className="rs-mono text-sm rs-fg-dim">$</span>
            <input
              type="text"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="github.com/vercel/next.js"
              className="rs-mono min-w-0 flex-1 bg-transparent text-sm outline-none rs-fg"
              style={{ caretColor: "var(--accent)" }}
            />
            <Link
              href="/preview"
              className="accent-button rs-mono flex flex-shrink-0 items-center gap-1.5 rounded px-3.5 py-1.5 text-xs uppercase tracking-wider transition-all"
            >
              Index
              <ArrowRight size={11} />
            </Link>
          </div>

          <div
            className="rs-fade-up rs-mono flex flex-wrap items-center gap-x-5 gap-y-2 text-xs rs-fg-dim"
            style={{ animationDelay: "0.4s" }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full rs-pulse"
                style={{ background: "var(--green)" }}
              />
              Free tier ready
            </span>
            <span>·</span>
            <span>public repos only</span>
            <span>·</span>
            <span>under 30 MB</span>
            <span>·</span>
            <span>local embeddings</span>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-20 md:px-8 md:py-24">
        <div className="absolute inset-0 veil-light" />
        <div className="relative mx-auto max-w-7xl">
          <div className="label-mark mb-6">Pick a topic</div>
          <h2
            className="rs-serif rs-fg mb-14 max-w-3xl md:mb-16"
            style={{ fontSize: "clamp(34px, 5vw, 64px)", lineHeight: 1 }}
          >
            What do you want to{" "}
            <em className="italic rs-accent">see first?</em>
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {topics.map((topic) => (
              <Link
                key={topic.href}
                href={topic.href}
                className="topic-card group rounded-lg p-8 md:p-10"
              >
                <div className="mb-8 flex items-start justify-between">
                  <span className="rs-mono text-xs rs-fg-faint">
                    {topic.num}
                  </span>
                  {topic.element}
                </div>
                <h3
                  className="rs-serif rs-fg mb-3"
                  style={{
                    fontSize: "clamp(32px, 4vw, 48px)",
                    lineHeight: 1.02,
                  }}
                >
                  {topic.title}
                </h3>
                <p className="rs-fg-dim mb-8 max-w-md text-[15px] leading-relaxed">
                  {topic.blurb}
                </p>
                <div className="rs-mono topic-arrow flex items-center gap-2 text-xs rs-fg-dim">
                  <span>{topic.cta}</span>
                  <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 py-20 md:px-8 md:py-28">
        <div className="absolute inset-0 veil-mid" />
        <div className="relative mx-auto max-w-4xl">
          <div className="label-mark mb-6">The deal</div>
          <p
            className="rs-serif rs-fg"
            style={{ fontSize: "clamp(28px, 3.5vw, 44px)", lineHeight: 1.25 }}
          >
            Reading a new codebase is the worst part of any job. You spend a
            week clicking through files, asking dumb questions in Slack, and
            trying to figure out what
            <em className="italic rs-accent"> actually </em>
            calls what.
          </p>
          <p
            className="rs-serif rs-fg-dim mt-8"
            style={{ fontSize: "clamp(22px, 2.5vw, 32px)", lineHeight: 1.35 }}
          >
            RepoSage just reads it for you. You ask, it answers, with citations
            so you can verify it is not making stuff up.
          </p>
        </div>
      </section>
    </>
  );
}
