"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputBase,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import type { StoredAudit } from "@/lib/security/types";
import type { FindingCategory, FindingSeverity, SecurityFinding } from "@/lib/security/types";
import { loadStoredSolutions, type StoredSolutionEntry } from "@/lib/explanation-session";
import { SecurityFindingDrawer } from "./security-finding-drawer";

export function SecurityDashboardView({
  analysisId,
  repository,
  commitSha,
  audit,
  findings: initialFindings,
}: {
  analysisId: string;
  repository: { owner: string; name: string };
  commitSha: string;
  audit: StoredAudit | null;
  findings: SecurityFinding[];
}) {
  const [filterSeverity, setFilterSeverity] = useState<FindingSeverity | "all">("all");
  const [filterCategory, setFilterCategory] = useState<FindingCategory | "all">("all");
  const [onlyReachable, setOnlyReachable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);
  const [formattedDate, setFormattedDate] = useState<string | null>(null);
  const [solutions, setSolutions] = useState<ReadonlyMap<string, StoredSolutionEntry>>(() => new Map());
  const [drawerTab, setDrawerTab] = useState<"description" | "solution">("description");

  useEffect(() => {
    const stored = loadStoredSolutions(analysisId);
    if (stored.size > 0) {
      setSolutions(new Map(stored));
    }
  }, [analysisId]);

  useEffect(() => {
    if (audit?.finishedAt) {
      setFormattedDate(new Date(audit.finishedAt).toLocaleString());
    }
  }, [audit?.finishedAt]);

  const filtered = initialFindings.filter((f) => {
    if (filterSeverity !== "all" && f.severity !== filterSeverity) return false;
    if (filterCategory !== "all" && f.category !== filterCategory) return false;
    if (onlyReachable && !f.isReachable) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        f.filePath.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.ruleId.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 36px)", bgcolor: "var(--canvas)" }}>
      {/* Subheader bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1,
          borderBottom: "1px solid var(--line)",
          bgcolor: "var(--surface)",
        }}
      >
        <Link href={`/analyses/${analysisId}`} style={{ textDecoration: "none" }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: "14px !important" }} />}
            sx={{
              height: 24,
              fontSize: "12px",
              textTransform: "none",
              color: "var(--fg)",
              border: "1px solid var(--line)",
              px: 1,
              "&:hover": { bgcolor: "var(--raised)" },
            }}
          >
            Back to Map
          </Button>
        </Link>

        <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "var(--fg)" }}>
          Security Audit & Loophole Report
        </Typography>

        <Typography
          sx={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "12px",
            color: "var(--fg-muted)",
          }}
        >
          {repository.owner}/{repository.name}
        </Typography>

        {audit?.finishedAt && (
          <Typography
            suppressHydrationWarning
            sx={{ ml: "auto", fontSize: "11px", color: "var(--fg-muted)" }}
          >
            {formattedDate ? `Audited ${formattedDate}` : ""}
          </Typography>
        )}
      </Box>

      {/* Metrics Row */}
      {audit && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 1.5,
            p: 2,
            borderBottom: "1px solid var(--line)",
            bgcolor: "var(--surface)",
          }}
        >
          <MetricCard
            label="Total Findings"
            count={initialFindings.length}
            active={filterSeverity === "all" && !onlyReachable}
            onClick={() => {
              setFilterSeverity("all");
              setOnlyReachable(false);
            }}
          />
          <MetricCard
            label="Critical"
            count={audit.criticalCount}
            color="#ef4444"
            active={filterSeverity === "critical"}
            onClick={() => setFilterSeverity(filterSeverity === "critical" ? "all" : "critical")}
          />
          <MetricCard
            label="High Severity"
            count={audit.highCount}
            color="var(--outgoing)"
            active={filterSeverity === "high"}
            onClick={() => setFilterSeverity(filterSeverity === "high" ? "all" : "high")}
          />
          <MetricCard
            label="Medium"
            count={audit.mediumCount}
            color="#eab308"
            active={filterSeverity === "medium"}
            onClick={() => setFilterSeverity(filterSeverity === "medium" ? "all" : "medium")}
          />
          <MetricCard
            label="Reachable Sinks"
            count={initialFindings.filter((f) => f.isReachable).length}
            color="#ef4444"
            active={onlyReachable}
            onClick={() => setOnlyReachable(!onlyReachable)}
          />
        </Box>
      )}

      {/* Controls: Search and Filters */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          px: 2,
          py: 1,
          borderBottom: "1px solid var(--line)",
          bgcolor: "var(--surface)",
        }}
      >
        <Paper
          component="form"
          onSubmit={(e) => e.preventDefault()}
          sx={{
            display: "flex",
            alignItems: "center",
            width: 280,
            height: 26,
            px: 1,
            bgcolor: "var(--canvas)",
            border: "1px solid var(--line)",
            boxShadow: "none",
            borderRadius: "4px",
          }}
        >
          <SearchIcon sx={{ fontSize: "14px", color: "var(--fg-muted)", mr: 0.5 }} />
          <InputBase
            placeholder="Search by file or rule…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ fontSize: "11px", color: "var(--fg)", flex: 1 }}
          />
        </Paper>

        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
          <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)" }}>Category:</Typography>
          {(
            [
              ["all", "All"],
              ["ast_sink", "AST Sinks"],
              ["secret_leak", "Secrets"],
              ["sca_vulnerability", "SCA CVEs"],
              ["config_flaw", "Configs"],
            ] as const
          ).map(([val, label]) => (
            <Chip
              key={val}
              label={label}
              size="small"
              onClick={() => setFilterCategory(val)}
              sx={{
                height: 20,
                fontSize: "10px",
                cursor: "pointer",
                bgcolor: filterCategory === val ? "var(--fg)" : "transparent",
                color: filterCategory === val ? "var(--surface)" : "var(--fg-muted)",
                border: "1px solid var(--line)",
              }}
            />
          ))}
        </Box>

        <Box sx={{ ml: "auto" }}>
          <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)" }}>
            Showing {filtered.length} of {initialFindings.length} findings
          </Typography>
        </Box>
      </Box>

      {/* Findings Container: Split when an item is selected */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: selectedFinding ? "minmax(0, 65%) 35%" : "1fr",
          bgcolor: "var(--surface)",
        }}
      >
        {/* Table Area */}
        <Box sx={{ minHeight: 0, overflowY: "auto", borderRight: selectedFinding ? "1px solid var(--line)" : "none" }}>
          {filtered.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <Typography sx={{ fontSize: "12px", color: "var(--fg-muted)" }}>
                {initialFindings.length === 0
                  ? "No security vulnerabilities or loopholes detected."
                  : "No findings matched your search filter."}
              </Typography>
            </Box>
          ) : (
            <Table size="small" sx={{ borderCollapse: "collapse", width: "100%" }}>
              <TableHead sx={{ bgcolor: "var(--canvas)", position: "sticky", top: 0, zIndex: 1 }}>
                <TableRow sx={{ height: 26, borderBottom: "1px solid var(--line)" }}>
                  <TableCell sx={{ width: 80, fontSize: "10px", color: "var(--fg-muted)", borderColor: "var(--line)", py: 0.5, px: 2 }}>
                    Severity
                  </TableCell>
                  <TableCell sx={{ fontSize: "10px", color: "var(--fg-muted)", borderColor: "var(--line)", py: 0.5, px: 2 }}>
                    Finding Description & Rule
                  </TableCell>
                  <TableCell sx={{ fontSize: "10px", color: "var(--fg-muted)", borderColor: "var(--line)", py: 0.5, px: 2 }}>
                    File Location
                  </TableCell>
                  <TableCell sx={{ width: 90, fontSize: "10px", color: "var(--fg-muted)", borderColor: "var(--line)", py: 0.5, px: 2 }}>
                    Reachability
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item, idx) => {
                  const key = item.id ?? `${item.filePath}-${item.lineNumber}-${idx}`;
                  const isSelected = selectedFinding?.id ? selectedFinding.id === item.id : selectedFinding === item;
                  return (
                    <TableRow
                      key={key}
                      onClick={() => setSelectedFinding(isSelected ? null : item)}
                      sx={{
                        cursor: "pointer",
                        borderBottom: "1px solid var(--line)",
                        bgcolor: isSelected ? "var(--raised)" : "transparent",
                        borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                        "&:hover": { bgcolor: "var(--raised)" },
                      }}
                    >
                      <TableCell sx={{ borderColor: "var(--line)", py: 1, px: 2, verticalAlign: "top" }}>
                        <SeverityBadge severity={item.severity} />
                      </TableCell>
                      <TableCell sx={{ borderColor: "var(--line)", py: 1, px: 2, verticalAlign: "top" }}>
                        <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "var(--fg)" }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)", mt: 0.25 }}>
                          {item.description}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: "var(--line)", py: 1, px: 2, verticalAlign: "top" }}>
                        <Typography
                          sx={{
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontSize: "11px",
                            color: "var(--fg-muted)",
                          }}
                        >
                          {item.filePath}
                          {item.lineNumber !== null ? `:${item.lineNumber}` : ""}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: "var(--line)", py: 1, px: 2, verticalAlign: "top" }}>
                        {item.isReachable ? (
                          <Box sx={{ display: "inline-block", px: 0.75, py: 0.2, bgcolor: "rgba(239, 68, 68, 0.1)", borderRadius: "3px" }}>
                            <Typography sx={{ fontSize: "10px", color: "#ef4444", fontWeight: 600 }}>
                              Reachable
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)" }}>
                            Internal Only
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Box>

        {/* Right 35%: SecurityFindingDrawer */}
        {selectedFinding && (
          <SecurityFindingDrawer
            finding={selectedFinding}
            analysisId={analysisId}
            initialSolution={
              solutions.get(selectedFinding.id ?? "") ??
              solutions.get(`${selectedFinding.ruleId}:${selectedFinding.filePath}:${selectedFinding.lineNumber ?? 0}`)
            }
            activeTab={drawerTab}
            onTabChange={setDrawerTab}
            onSolutionSaved={(key, entry) => {
              setSolutions((prev) => {
                const next = new Map(prev);
                next.set(key, entry);
                if (selectedFinding.id) next.set(selectedFinding.id, entry);
                next.set(`${selectedFinding.ruleId}:${selectedFinding.filePath}:${selectedFinding.lineNumber ?? 0}`, entry);
                return next;
              });
            }}
            onClose={() => setSelectedFinding(null)}
          />
        )}
      </Box>
    </Box>
  );
}

function MetricCard({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.25,
        borderRadius: "4px",
        border: active ? "1px solid var(--fg)" : "1px solid var(--line)",
        bgcolor: active ? "var(--raised)" : "var(--canvas)",
        cursor: "pointer",
        transition: "all 0.1s",
        "&:hover": { borderColor: "var(--fg-muted)" },
      }}
    >
      <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)", mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: "18px", fontWeight: 600, color: color ?? "var(--fg)", lineHeight: 1 }}>
        {count}
      </Typography>
    </Box>
  );
}

function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  const colorMap: Record<FindingSeverity, { bg: string; text: string }> = {
    critical: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
    high: { bg: "rgba(249, 115, 22, 0.15)", text: "var(--outgoing)" },
    medium: { bg: "rgba(234, 179, 8, 0.15)", text: "#eab308" },
    low: { bg: "rgba(148, 163, 184, 0.15)", text: "var(--fg-muted)" },
    info: { bg: "rgba(148, 163, 184, 0.1)", text: "var(--fg-muted)" },
  };

  const c = colorMap[severity] ?? colorMap.info;

  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 0.75,
        py: 0.2,
        borderRadius: "3px",
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        bgcolor: c.bg,
        color: c.text,
      }}
    >
      {severity}
    </Box>
  );
}
