import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ThemeControl } from "@/components/theme-control";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SecurityIcon from "@mui/icons-material/Security";
import HubIcon from "@mui/icons-material/Hub";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

export default async function LandingPage() {
  const { userId } = await auth();
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--canvas)] text-[var(--fg)] selection:bg-[var(--accent)] selection:text-[var(--accent-fg)]">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[var(--accent)] to-[var(--outgoing)] opacity-15 sm:left-[calc(50%-25rem)] sm:w-[68rem]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)]/80 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--raised)] text-[var(--accent)]">
            <HubIcon sx={{ fontSize: 16 }} />
          </div>
          <span className="font-semibold text-[14px] tracking-tight text-[var(--fg)]">Beacon</span>
          <span className="rounded border border-[var(--line)] bg-[var(--raised)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--fg-muted)]">
            v0.1
          </span>
        </div>

        {/* Top Right Controls: Theme + Auth Buttons */}
        <div className="flex items-center gap-2.5">
          <ThemeControl initial={theme} height={32} />

          {userId ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/organizations"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 text-[12px] font-medium text-[var(--accent-fg)] shadow-sm transition-opacity hover:opacity-90"
              >
                Go to Dashboard
                <ArrowForwardIcon sx={{ fontSize: 13 }} />
              </Link>
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-3.5 text-[12px] font-medium text-[var(--fg)] shadow-xs transition-colors hover:bg-[var(--raised)]"
              >
                Log In
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-8 items-center justify-center rounded-md bg-[var(--accent)] px-3.5 text-[12px] font-medium text-[var(--accent-fg)] shadow-sm transition-opacity hover:opacity-90"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
        {/* Top subtle pill badge */}
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[11px] font-medium text-[var(--fg-muted)] shadow-sm">
          <AutoAwesomeIcon sx={{ fontSize: 13, color: "var(--accent)" }} />
          <span>AST-Grounded Codebase Intelligence & Security</span>
        </div>

        {/* Centered Main Headline */}
        <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[var(--fg)] sm:text-5xl lg:text-6xl">
          Map your codebase dependencies. <br />
          <span className="text-[var(--accent)]">Inspect blast radii and security.</span>
        </h1>

        {/* Short Centered Description */}
        <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-[var(--fg-muted)] sm:text-[15px]">
          Beacon turns any TypeScript or JavaScript repository into an interactive, deterministic AST dependency graph.
          Explore complex module relationships, calculate change impact before merging, and detect reachable vulnerabilities with zero AI hallucinations.
        </p>

        {/* Call to action button */}
        <div className="mt-8 flex items-center justify-center">
          {userId ? (
            <Link
              href="/dashboard/organizations"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-6 text-[13px] font-medium text-[var(--accent-fg)] shadow-sm transition-opacity hover:opacity-90"
            >
              Open Your Dashboard
              <ArrowForwardIcon sx={{ fontSize: 15 }} />
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-6 text-[13px] font-medium text-[var(--accent-fg)] shadow-sm transition-opacity hover:opacity-90"
            >
              Get Started Free
              <ArrowForwardIcon sx={{ fontSize: 15 }} />
            </Link>
          )}
        </div>

        {/* Core Pillars Strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 border-y border-[var(--line)]/60 py-3.5 text-[11px] text-[var(--fg-muted)] sm:gap-10">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[var(--incoming)]" />
            <span>Deterministic AST Parsing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[var(--accent)]" />
            <span>Clerk Multi-Tenant Organizations</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[var(--outgoing)]" />
            <span>Postgres Row-Level Security</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#ef4444]" />
            <span>Zero AI Hallucinations</span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 transition-shadow hover:shadow-sm">
            <div className="mb-3 flex size-8 items-center justify-center rounded bg-[var(--raised)] text-[var(--accent)]">
              <HubIcon sx={{ fontSize: 18 }} />
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--fg)]">AST Dependency Graphs</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--fg-muted)]">
              Deterministic parsing via TypeScript Compiler API (<code className="font-mono text-[11px]">ts-morph</code>). Complete import, re-export, and dynamic call resolution.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 transition-shadow hover:shadow-sm">
            <div className="mb-3 flex size-8 items-center justify-center rounded bg-[var(--raised)] text-[var(--outgoing)]">
              <AccountTreeIcon sx={{ fontSize: 18 }} />
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--fg)]">Blast Radius Analysis</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--fg-muted)]">
              Instant arithmetic across all incoming and outgoing connections. Know every affected downstream module before you refactor or push.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 transition-shadow hover:shadow-sm">
            <div className="mb-3 flex size-8 items-center justify-center rounded bg-[var(--raised)] text-[#ef4444]">
              <SecurityIcon sx={{ fontSize: 18 }} />
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--fg)]">Automated Security Audits</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--fg-muted)]">
              Identifies AST sinks, hardcoded secrets, and dependency CVEs, with call-path reachability proof and one-click AI code remediation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-6 text-center text-[11px] text-[var(--fg-muted)]">
        <p>Beacon • Deterministic Codebase Architecture & Security</p>
      </footer>
    </div>
  );
}
