"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Box, Typography, Button, Skeleton } from "@mui/material";
import type { ExplainResult } from "@/app/(workspace)/analyses/[id]/actions";
import { railLabel } from "@/lib/roles";
import { ExplanationText } from "./explanation-text";
import { RerunButton } from "./progress/rerun-button";

export type ExplainTarget = { kind: "file"; path: string } | { kind: "group"; dir: string };

export function targetKey(target: ExplainTarget): string {
  return target.kind === "file" ? `file:${target.path}` : `group:${target.dir}`;
}

export type ExplanationState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; result: Extract<ExplainResult, { ok: true }> };

/** Whether what was explained is still what the repository holds. */
export type Freshness =
  | { status: "checking" }
  | { status: "current" }
  /** The repository has moved past the analysed commit. For a file, what became of it; a folder has no single hash to compare. */
  | { status: "moved"; head: string; file: "unchanged" | "changed" | "deleted" | null }
  | { status: "unknown"; error: string };

export function ExplanationPanel(props: {
  target: ExplainTarget;
  analysisId: string;
  commitSha: string;
  state: ExplanationState | undefined;
  freshness: Freshness | undefined;
  onExplain: (target: ExplainTarget) => void;
  isPath: (path: string) => boolean;
  renderPath: (path: string) => ReactNode;
}) {
  const { target, state } = props;
  const what = target.kind === "file" ? "this file" : "this folder";

  if (!state) {
    return (
      <Box sx={{ px: 1.5, py: 1.5, fontSize: "11px" }}>
        <ExplainButton label="Explain" onClick={() => props.onExplain(target)} />
        <Typography sx={{ mt: 1, fontSize: "11px", color: "var(--fg-muted)" }}>
          {target.kind === "file"
            ? "Written by a model from this file's source and every file it imports or is imported by, as parsed."
            : "Written by a model from what's in this folder and every import crossing into or out of it, as parsed."}
        </Typography>
      </Box>
    );
  }
  if (state.status === "loading") {
    return (
      <Box sx={{ px: 1.5, py: 1.5 }}>
        <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)", mb: 1 }}>
          Explaining {what}…
        </Typography>
        <Skeleton variant="text" sx={{ fontSize: "12px", bgcolor: "var(--line)", opacity: 0.2 }} />
        <Skeleton variant="text" sx={{ fontSize: "12px", bgcolor: "var(--line)", opacity: 0.2 }} />
        <Skeleton variant="text" sx={{ fontSize: "12px", width: "60%", bgcolor: "var(--line)", opacity: 0.2 }} />
      </Box>
    );
  }
  if (state.status === "error") {
    return (
      <Box sx={{ px: 1.5, py: 1.5, fontSize: "11px" }}>
        <Typography sx={{ fontSize: "11px", color: "var(--fg)" }}>Couldn&apos;t explain {what}.</Typography>
        <Typography sx={{ mt: 0.5, fontSize: "11px", color: "var(--fg-muted)", wordBreak: "break-word" }}>
          {state.error}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <ExplainButton label="Try again" onClick={() => props.onExplain(target)} />
        </Box>
      </Box>
    );
  }

  const { result } = state;
  return (
    <Box sx={{ px: 1.5, py: 1.5 }}>
      <FreshnessNote freshness={props.freshness} target={target} analysisId={props.analysisId} commitSha={props.commitSha} />
      <ExplanationText text={result.body} isPath={props.isPath} onPath={props.renderPath} />
      <Box sx={{ mt: 1.5, borderTop: "1px solid var(--line)", pt: 1, fontSize: "10px", color: "var(--fg-muted)", display: "flex", flexDirection: "column", gap: 0.5 }}>
        {result.labelled && (
          <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)" }}>
            {result.labelled.role === null
              ? "No convention identified this file, and the model found no role that fits."
              : `No convention identified this file; the model labelled it ${railLabel(result.labelled.role).toLowerCase()}.`}
          </Typography>
        )}
        {result.labelError && (
          <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)" }}>
            Labelling this file failed: {result.labelError}
          </Typography>
        )}
        <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)" }}>
          <Box component="span" sx={{ fontFamily: "var(--font-geist-mono), monospace" }}>{result.model}</Box> · {result.cached ? "from cache, no model call" : "new answer"}
        </Typography>
        <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)" }}>
          {result.tracing.on ? `Traced to LangSmith project ${result.tracing.project}` : `Not traced: ${result.tracing.reason}`}
        </Typography>
      </Box>
    </Box>
  );
}

function FreshnessNote(props: { freshness: Freshness | undefined; target: ExplainTarget; analysisId: string; commitSha: string }) {
  const router = useRouter();
  const f = props.freshness;
  if (!f || f.status === "current") return null;
  const analysed = <Box component="span" sx={{ fontFamily: "var(--font-geist-mono), monospace" }}>{props.commitSha.slice(0, 7)}</Box>;
  if (f.status === "checking") {
    return <Typography sx={{ mb: 1, fontSize: "10px", color: "var(--fg-muted)" }}>Checking the repository for newer commits…</Typography>;
  }
  if (f.status === "unknown") {
    return <Typography sx={{ mb: 1, fontSize: "10px", color: "var(--fg-muted)" }}>Couldn&apos;t check whether this is still current: {f.error}</Typography>;
  }
  const head = <Box component="span" sx={{ fontFamily: "var(--font-geist-mono), monospace" }}>{f.head.slice(0, 7)}</Box>;
  let sentence: ReactNode;
  if (f.file === "changed") sentence = <>This file has changed since {analysed} was analysed, so this explanation is stale. The repository is at {head}.</>;
  else if (f.file === "deleted") sentence = <>This file no longer exists at {head}, the repository&apos;s latest commit. {analysed} was analysed.</>;
  else if (f.file === "unchanged")
    sentence = <>The repository has moved past {analysed} to {head}. This file is unchanged, but its neighbours may not be.</>;
  else sentence = <>The repository has moved past {analysed} to {head}, so this explanation may be stale.</>;

  return (
    <Box sx={{ mb: 1.5, borderRadius: "3px", border: "1px solid var(--line)", bgcolor: "var(--raised)", px: 1, py: 0.75, fontSize: "11px" }}>
      <Typography sx={{ fontSize: "11px", color: "var(--fg)" }}>{sentence}</Typography>
      <Box sx={{ mt: 1 }}>
        <RerunButton analysisId={props.analysisId} label="Re-analyse" onStarted={() => router.refresh()} />
      </Box>
    </Box>
  );
}

function ExplainButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      size="small"
      onClick={onClick}
      sx={{
        borderRadius: "3px",
        border: "1px solid var(--line)",
        px: 1,
        py: 0.25,
        height: "auto",
        fontSize: "11px",
        textTransform: "none",
        color: "var(--fg)",
        bgcolor: "transparent",
        minWidth: "auto",
        "&:hover": { bgcolor: "var(--raised)", borderColor: "var(--line)" },
      }}
    >
      {label}
    </Button>
  );
}
