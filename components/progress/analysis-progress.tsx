"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useOrganization } from "@clerk/nextjs";
import { StateMark } from "@/components/state-mark";
import { STAGES, STALE_AFTER_MS, type Progress } from "@/lib/pipeline/stages";
import { RerunButton } from "./rerun-button";
import { sameProgress, useProgress } from "./use-progress";

type Props = {
  analysisId: string;
  repository: { owner: string; name: string };
  commitSha: string | null;
  initial: Progress;
  /** Worked out by the server at render; only true while nothing has moved since. */
  staleAtRender: boolean;
  /** Formatted by the server, so the browser renders the text it was sent. */
  started: { iso: string; ago: string } | null;
};

type Step = "done" | "current" | "failed" | "stale" | "pending";

export function AnalysisProgress({ analysisId, repository, commitSha, initial, staleAtRender, started }: Props) {
  const { progress, lost, restarted } = useProgress(analysisId, initial);
  const router = useRouter();
  const { organization } = useOrganization();

  const projectsUrl = organization
    ? `/dashboard/organization/${encodeURIComponent(organization.slug || organization.name)}/projects`
    : "/dashboard/organizations";

  // Stored is the last stage; once it lands the server has a map to render at
  // this same address, so the page is re-rendered into it.
  const complete = progress.status === "complete";
  useEffect(() => {
    if (complete) router.refresh();
  }, [complete, router]);
  const stale = staleAtRender && sameProgress(progress, initial);
  const current = STAGES.findIndex((s) => s.stage === progress.stage);
  const canRerun = stale || progress.status === "complete" || progress.status === "failed";

  const step = (i: number): Step => {
    if (progress.status === "complete") return "done";
    if (progress.status === "queued" || current === -1 || i > current) return "pending";
    if (i < current) return "done";
    if (progress.status === "failed") return "failed";
    return stale ? "stale" : "current";
  };

  return (
    <Box sx={{ display: "flex", height: "100%", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          height: 36,
          flexShrink: 0,
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid var(--line)",
          px: 1.5,
          fontSize: "12px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Link
            href={projectsUrl}
            style={{ textDecoration: "none" }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: "13px",
                color: "var(--fg-muted)",
                transition: "color 0.1s",
                "&:hover": { color: "var(--fg)" },
              }}
            >
              Projects
            </Typography>
          </Link>
          <Typography component="span" sx={{ color: "var(--line)", fontSize: "12px" }}>
            /
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "13px",
              lineHeight: 1,
            }}
          >
            <Typography component="span" sx={{ color: "var(--fg-muted)", fontFamily: "inherit", fontSize: "inherit" }}>
              {repository.owner}/
            </Typography>
            <Typography component="span" sx={{ fontWeight: 600, color: "var(--fg)", fontFamily: "inherit", fontSize: "inherit" }}>
              {repository.name}
            </Typography>
          </Typography>
        </Box>

        {commitSha && (
          <Typography
            component="span"
            title={commitSha}
            sx={{
              fontFamily: "var(--font-geist-mono), monospace",
              color: "var(--fg-muted)",
              fontSize: "12px",
            }}
          >
            {commitSha.slice(0, 7)}
          </Typography>
        )}

        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "var(--fg-muted)", fontSize: "12px" }}>
          <StateMark status={progress.status} stale={stale} />
          {stale ? "stale" : progress.status}
        </Box>

        <Box component="span" sx={{ ml: "auto" }}>
          {canRerun && <RerunButton analysisId={analysisId} onStarted={restarted} />}
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 2 }}>
        <Box component="ol" sx={{ maxWidth: 672, fontSize: "12px", listStyle: "none", p: 0, m: 0 }}>
          {STAGES.map(({ stage, label }, i) => {
            const state = step(i);
            const detail = state === "current" || state === "failed" || state === "stale" ? progress.message : null;
            return (
              <Box
                component="li"
                key={stage}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1rem 7rem minmax(0, 1fr)",
                  alignItems: "baseline",
                  columnGap: 1,
                  py: 0.5,
                }}
              >
                <Box component="span" sx={{ color: state === "pending" ? "var(--line)" : "var(--fg)" }}>
                  <StepMark state={state} />
                </Box>
                <Typography component="span" sx={{ fontSize: "12px", color: state === "pending" ? "var(--fg-muted)" : "var(--fg)" }}>
                  {label}
                </Typography>
                <Typography component="span" sx={{ fontSize: "12px", color: state === "failed" ? "var(--fg)" : "var(--fg-muted)" }}>
                  {detail}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {stale && (
          <Typography sx={{ mt: 1.5, maxWidth: 672, fontSize: "12px", color: "var(--fg-muted)" }}>
            No progress for over {STALE_AFTER_MS / 60000} minutes
            {started && (
              <>
                {" "}
                since it started{" "}
                <time dateTime={started.iso} title={started.iso}>
                  {started.ago}
                </time>
              </>
            )}
            . The process running it has most likely stopped; re-run to start again.
          </Typography>
        )}
        {complete && progress.message && (
          <Typography sx={{ mt: 1.5, fontSize: "12px", color: "var(--fg)" }}>
            {progress.message} — opening the map…
          </Typography>
        )}
        {lost && (
          <Typography sx={{ mt: 1.5, maxWidth: 672, fontSize: "12px", color: "var(--fg)" }}>
            Live updates stopped ({lost}). Reload to see where the run is.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function StepMark({ state }: { state: Step }) {
  switch (state) {
    case "done":
      return <StateMark status="complete" />;
    case "current":
      return <StateMark status="running" />;
    case "stale":
      return <StateMark status="running" stale />;
    case "failed":
      return <StateMark status="failed" />;
    case "pending":
      return <StateMark status="queued" />;
  }
}
