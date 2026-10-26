import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import { AnalysisRow, type RowData } from "@/components/progress/analysis-row";
import { StateMark } from "@/components/state-mark";
import { SubmitForm } from "@/components/submit-form";
import { isStale, type Status } from "@/lib/pipeline/stages";
import { createServerSupabase } from "@/lib/supabase/server";
import { ago } from "@/lib/time";

const LIST_LIMIT = 100;
type Tally = Status | "stale";
const TALLY_ORDER: Tally[] = ["running", "queued", "stale", "complete", "failed"];

export default async function RunsPage() {
  const { sessionClaims } = await auth();

  const orgName = sessionClaims?.org_name;
  if (!orgName) {
    throw new Error(
      'Session token has no org_name claim. Add "org_name": "{{org.name}}" in Clerk → Sessions → Customize session token.',
    );
  }

  const rows = await loadRows();

  const counts = new Map<Tally, number>();
  for (const r of rows) {
    const tally: Tally = r.staleAtRender ? "stale" : r.progress.status;
    counts.set(tally, (counts.get(tally) ?? 0) + 1);
  }

  return (
    <Box sx={{ display: "flex", height: "100%", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          height: 36,
          flexShrink: 0,
          alignItems: "center",
          gap: 2,
          borderBottom: "1px solid var(--line)",
          px: 1.5,
        }}
      >
        <Typography component="h1" sx={{ fontSize: "13px", fontWeight: 600, color: "var(--fg)" }}>
          {orgName}
        </Typography>

        <Typography
          component="span"
          sx={{
            fontSize: "12px",
            color: "var(--fg-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {rows.length === LIST_LIMIT
            ? `Latest ${LIST_LIMIT} analyses`
            : `${rows.length} ${rows.length === 1 ? "analysis" : "analyses"}`}
        </Typography>

        <SubmitForm />

        {rows.length > 0 && (
          <Box
            component="ul"
            sx={{
              ml: "auto",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              fontSize: "12px",
              color: "var(--fg-muted)",
              fontVariantNumeric: "tabular-nums",
              listStyle: "none",
              p: 0,
              m: 0,
            }}
          >
            {TALLY_ORDER.filter((s) => counts.has(s)).map((s) => (
              <Box component="li" key={s} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <StateMark status={s === "stale" ? "running" : s} stale={s === "stale"} />
                {counts.get(s)} {s}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {rows.length === 0 ? (
        <Box sx={{ px: 1.5, py: 5, fontSize: "12px", color: "var(--fg-muted)" }}>
          <Typography sx={{ fontSize: "12px", color: "var(--fg)" }}>No analyses yet.</Typography>
          <Typography sx={{ fontSize: "12px", color: "var(--fg-muted)", mt: 0.5 }}>
            Paste a public GitHub repository above to map it.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ minHeight: 0, flex: 1, overflow: "auto" }}>
          <Table
            size="small"
            sx={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <colgroup>
              <col />
              <col style={{ width: 112 }} />
              <col style={{ width: 80 }} className="hidden sm:table-column" />
              <col style={{ width: 80 }} />
              <col style={{ width: 80 }} className="hidden sm:table-column" />
            </colgroup>
            <TableHead
              sx={{
                position: "sticky",
                top: 0,
                bgcolor: "var(--canvas)",
                zIndex: 1,
              }}
            >
              <TableRow sx={{ height: 28, borderBottom: "1px solid var(--line)" }}>
                <TableCell sx={{ px: 1.5, py: 0.5, fontSize: "12px", fontWeight: 400, color: "var(--fg-muted)", borderColor: "var(--line)" }}>
                  Repository
                </TableCell>
                <TableCell sx={{ px: 1.5, py: 0.5, fontSize: "12px", fontWeight: 400, color: "var(--fg-muted)", borderColor: "var(--line)" }}>
                  State
                </TableCell>
                <TableCell className="hidden sm:table-cell" sx={{ px: 1.5, py: 0.5, fontSize: "12px", fontWeight: 400, color: "var(--fg-muted)", borderColor: "var(--line)" }}>
                  Commit
                </TableCell>
                <TableCell align="right" sx={{ px: 1.5, py: 0.5, fontSize: "12px", fontWeight: 400, color: "var(--fg-muted)", borderColor: "var(--line)" }}>
                  Started
                </TableCell>
                <TableCell className="hidden sm:table-cell" align="right" sx={{ px: 1.5, py: 0.5, fontSize: "12px", fontWeight: 400, color: "var(--fg-muted)", borderColor: "var(--line)" }}>
                  Finished
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <AnalysisRow key={row.id} row={row} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

async function loadRows(): Promise<RowData[]> {
  const supabase = await createServerSupabase();
  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("id, status, stage, stage_message, commit_sha, error, created_at, started_at, finished_at, projects(repo_owner, repo_name)")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw new Error(`Couldn't load analyses: ${error.message}`);

  await connection();
  const now = Date.now();
  return analyses.map((a) => ({
    id: a.id,
    repository: a.projects ? { owner: a.projects.repo_owner, name: a.projects.repo_name } : null,
    commitSha: a.commit_sha,
    progress: { status: a.status, stage: a.stage, message: a.status === "failed" ? a.error : a.stage_message },
    staleAtRender: isStale(a, now),
    created: { iso: a.created_at, ago: ago(a.created_at, now) },
    finished: a.finished_at ? { iso: a.finished_at, ago: ago(a.finished_at, now) } : null,
  }));
}
