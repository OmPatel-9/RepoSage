"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { GitBranch } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
};

const links: NavLink[] = [
  { href: "/how", label: "How it works" },
  { href: "/features", label: "What it does" },
  { href: "/preview", label: "Live preview" },
  { href: "/stack", label: "The stack" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-8">
      <Link href="/" className="logo-btn">
        <div
          className="h-2 w-2 rounded-full rs-pulse"
          style={{ background: "var(--accent)" }}
        />
        <span className="rs-mono text-sm tracking-wider rs-fg">REPO_SAGE</span>
      </Link>
      <div className="hidden items-center gap-6 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href ? "active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
        <a href="#" className="nav-link">
          <GitBranch size={12} />
          Github
        </a>
        <Show when="signed-out">
          <SignInButton mode="redirect">
            <button className="nav-link">Sign in</button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/app"
            className={`nav-link ${pathname === "/app" ? "active" : ""}`}
          >
            Open app
          </Link>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: {
                  height: "24px",
                  width: "24px",
                },
              },
            }}
          />
        </Show>
      </div>
    </nav>
  );
}
