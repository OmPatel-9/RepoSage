import { ArrowRight, GitBranch } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="relative border-t px-6 py-16 veil-heavy md:px-8 md:py-20"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid grid-cols-1 gap-10 md:mb-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <h3
              className="rs-serif rs-fg mb-3"
              style={{
                fontSize: "clamp(28px, 3.5vw, 44px)",
                lineHeight: 1.05,
              }}
            >
              Ready to index a repo?
            </h3>
            <p className="rs-fg-dim text-[15px]">
              Drop a GitHub link on the home page and see what it can do.
            </p>
          </div>
          <div className="md:col-span-7 md:text-right">
            <Link
              href="/"
              className="accent-button rs-mono inline-flex items-center gap-2 rounded px-5 py-3 text-xs uppercase tracking-wider transition-all"
            >
              Back to the top
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        <div
          className="flex flex-col items-start justify-between gap-8 border-t pt-8 md:flex-row md:items-center"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <Link href="/" className="logo-btn mb-3">
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              <span className="rs-mono text-sm tracking-wider rs-fg">
                REPO_SAGE
              </span>
            </Link>
            <p className="rs-mono max-w-md text-xs leading-relaxed rs-fg-dim">
              A portfolio project. The engineering is real. The bill is just
              zero.
            </p>
          </div>
          <div className="rs-mono flex flex-wrap items-center gap-x-5 gap-y-2 text-xs rs-fg-dim">
            <Link className="nav-link" href="/how">
              How
            </Link>
            <Link className="nav-link" href="/features">
              Features
            </Link>
            <Link className="nav-link" href="/preview">
              Preview
            </Link>
            <Link className="nav-link" href="/stack">
              Stack
            </Link>
            <a href="#" className="nav-link">
              <GitBranch size={12} /> Github
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
