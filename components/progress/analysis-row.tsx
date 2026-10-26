"use client";

import Link from "next/link";
import { TableRow, TableCell, Box, Typography } from "@mui/material";
import { StateMark } from "@/components/state-mark";
import { STALE_AFTER_MS, type Progress } from "@/lib/pipeline/stages";
import { sameProgress, useProgress } from "./use-progress";

export type RowData = {
  id: string;
  repository: { owner: string; name: string } | null;
  commitSha: string | null;
  progress: Progress;
  staleAtRender: boolean;
  // Formatted by the server, so the browser renders the same text it was sent.
  created: { iso: string; ago: string };
  finished: { iso: string; ago: string } | null;
};

// One dashboard row. An unfinished one follows its own channel, so a run
// started in another tab moves here too.
export function AnalysisRow({ row }: { row: RowData }) {
  const { progress } = useProgress(row.id, row.progress);
  const stale = row.staleAtRender && sameProgress(progress, row.progress);
  const finishedNow = !row.finished && (progress.status === "complete" || progress.status === "failed");
  const note = progress.status === "complete" ? null : progress.message;

  return (
    <TableRow
      sx={{
        borderBottom: "1px solid var(--line)",
        verticalAlign: "top",
        transition: "background-color 0.1s",
        "&:hover": {
          bgcolor: "var(--raised)",
        },
      }}
    >
      <TableCell
        sx={{
          px: 1.5,
          py: 0.75,
          borderColor: "var(--line)",
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "12px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <Link href={`/analyses/${row.id}`} className="block">
          {row.repository ? (
            <>
              <Typography component="span" sx={{ fontSize: "12px", color: "var(--fg-muted)", fontFamily: "inherit" }}>
                {row.repository.owner}/
              </Typography>
              <Typography component="span" sx={{ fontSize: "12px", fontWeight: 600, color: "var(--fg)", fontFamily: "inherit" }}>
                {row.repository.name}
              </Typography>
            </>
          ) : (
            <Typography component="span" sx={{ fontSize: "12px", color: "var(--fg-muted)", fontFamily: "inherit" }}>
              —
            </Typography>
          )}
          {note && (
            <Typography
              component="span"
              title={note}
              sx={{
                mt: 0.5,
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-geist-sans), sans-serif",
                fontSize: "12px",
                color: "var(--fg-muted)",
              }}
            >
              {stale ? `No progress for over ${STALE_AFTER_MS / 60000} minutes — ${note}` : note}
            </Typography>
          )}
        </Link>
      </TableCell>
      <TableCell sx={{ px: 1.5, py: 0.75, borderColor: "var(--line)", fontSize: "12px" }}>
        <Box
          component="span"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            color: progress.status === "queued" ? "var(--fg-muted)" : "var(--fg)",
          }}
        >
          <StateMark status={progress.status} stale={stale} />
          {stale ? "stale" : progress.status}
          {progress.status === "running" && !stale && progress.stage && (
            <Typography component="span" sx={{ fontSize: "12px", color: "var(--fg-muted)" }}>
              · {progress.stage}
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell
        className="hidden sm:table-cell"
        sx={{
          px: 1.5,
          py: 0.75,
          borderColor: "var(--line)",
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "12px",
          color: "var(--fg-muted)",
        }}
      >
        {row.commitSha ? <Box component="span" title={row.commitSha}>{row.commitSha.slice(0, 7)}</Box> : "—"}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          px: 1.5,
          py: 0.75,
          borderColor: "var(--line)",
          fontSize: "12px",
          fontVariantNumeric: "tabular-nums",
          color: "var(--fg-muted)",
        }}
      >
        <time dateTime={row.created.iso} title={row.created.iso}>
          {row.created.ago}
        </time>
      </TableCell>
      <TableCell
        className="hidden sm:table-cell"
        align="right"
        sx={{
          px: 1.5,
          py: 0.75,
          borderColor: "var(--line)",
          fontSize: "12px",
          fontVariantNumeric: "tabular-nums",
          color: "var(--fg-muted)",
        }}
      >
        {row.finished ? (
          <time dateTime={row.finished.iso} title={row.finished.iso}>
            {row.finished.ago}
          </time>
        ) : finishedNow ? (
          "just now"
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );
}
