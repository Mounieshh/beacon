import Link from "next/link";
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
import { AnalysisRow } from "@/components/progress/analysis-row";
import { StateMark } from "@/components/state-mark";
import { SubmitForm } from "@/components/submit-form";
import type { Status } from "@/lib/pipeline/stages";
import { loadOrganizationRuns } from "@/lib/dashboard/data";

const LIST_LIMIT = 100;
type Tally = Status | "stale";
const TALLY_ORDER: Tally[] = ["running", "queued", "stale", "complete", "failed"];

interface PageProps {
  params: Promise<{
    organization_name: string;
    project_name: string;
  }>;
}

export default async function SpecificProjectRunsPage({ params }: PageProps) {
  const { organization_name, project_name } = await params;
  const decodedOrgName = decodeURIComponent(organization_name);
  const decodedProjectName = decodeURIComponent(project_name);

  // Directly load real runs filtered by project name from Supabase db
  const rows = await loadOrganizationRuns(decodedProjectName);

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
          gap: 1.5,
          borderBottom: "1px solid var(--line)",
          px: 1.5,
        }}
      >
        <SubmitForm />

        {rows.length > 0 && (
          <ul className="ml-auto flex items-center gap-3 text-xs text-fg-muted tabular-nums">
            {TALLY_ORDER.filter((s) => counts.has(s)).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <StateMark status={s === "stale" ? "running" : s} stale={s === "stale"} />
                {counts.get(s)} {s}
              </li>
            ))}
          </ul>
        )}
      </Box>

      {rows.length === 0 ? (
        <Box sx={{ px: 1.5, py: 5, fontSize: "12px", color: "var(--fg-muted)" }}>
          <Typography sx={{ fontSize: "12px", color: "var(--fg)" }}>
            No analyses found for repository &quot;{decodedProjectName}&quot;.
          </Typography>
          <Typography sx={{ fontSize: "12px", color: "var(--fg-muted)", mt: 0.5 }}>
            Paste a public GitHub repository above to start mapping it.
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
