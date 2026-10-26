"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { FindingCategory, FindingSeverity, SecurityFinding, StoredAudit } from "@/lib/security/types";

export function SecurityAuditDialog({
  open,
  onClose,
  analysisId,
  repository,
  commitSha,
  audit,
  findings,
  loading,
  error,
  onRerun,
}: {
  open: boolean;
  onClose: () => void;
  analysisId: string;
  repository: { owner: string; name: string };
  commitSha: string;
  audit: StoredAudit | null;
  findings: SecurityFinding[];
  loading: boolean;
  error: string | null;
  onRerun: () => void;
}) {
  const [filterSeverity, setFilterSeverity] = useState<FindingSeverity | "all">("all");
  const [filterCategory, setFilterCategory] = useState<FindingCategory | "all">("all");
  const [onlyReachable, setOnlyReachable] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = findings.filter((f) => {
    if (filterSeverity !== "all" && f.severity !== filterSeverity) return false;
    if (filterCategory !== "all" && f.category !== filterCategory) return false;
    if (onlyReachable && !f.isReachable) return false;
    return true;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "var(--surface)",
            border: "1px solid var(--line)",
            backgroundImage: "none",
            borderRadius: "6px",
            color: "var(--fg)",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {/* Dialog Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.25,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "13px", color: "var(--fg)" }}>
            Security Audit Report
          </Typography>
          <Typography
            sx={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "12px",
              color: "var(--fg-muted)",
            }}
          >
            {repository.owner}/{repository.name} @ {commitSha.slice(0, 7)}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "var(--fg-muted)" }}>
          <CloseIcon sx={{ fontSize: "16px" }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, overflowY: "auto", flex: 1 }}>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 1.5 }}>
            <CircularProgress size={24} sx={{ color: "var(--fg)" }} />
            <Typography sx={{ fontSize: "12px", color: "var(--fg-muted)" }}>
              Running deterministic security audit and loophole analysis…
            </Typography>
            <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)" }}>
              Scanning AST sinks, secrets, lockfiles, and route reachability
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography sx={{ fontSize: "13px", color: "#ef4444", mb: 1.5 }}>
              Security audit failed: {error}
            </Typography>
            <Button
              size="small"
              onClick={onRerun}
              sx={{
                fontSize: "12px",
                textTransform: "none",
                border: "1px solid var(--line)",
                color: "var(--fg)",
              }}
            >
              Try Again
            </Button>
          </Box>
        ) : (
          <Box>
            {/* Top metrics summary bar */}
            {audit && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                  px: 2,
                  py: 1.25,
                  bgcolor: "var(--canvas)",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <Chip
                  label={`Critical: ${audit.criticalCount}`}
                  size="small"
                  onClick={() => setFilterSeverity(filterSeverity === "critical" ? "all" : "critical")}
                  sx={{
                    height: 20,
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    bgcolor: filterSeverity === "critical" ? "#ef4444" : "transparent",
                    color: filterSeverity === "critical" ? "#fff" : "#ef4444",
                    border: "1px solid #ef4444",
                  }}
                />
                <Chip
                  label={`High: ${audit.highCount}`}
                  size="small"
                  onClick={() => setFilterSeverity(filterSeverity === "high" ? "all" : "high")}
                  sx={{
                    height: 20,
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    bgcolor: filterSeverity === "high" ? "var(--outgoing)" : "transparent",
                    color: filterSeverity === "high" ? "#000" : "var(--outgoing)",
                    border: "1px solid var(--outgoing)",
                  }}
                />
                <Chip
                  label={`Medium: ${audit.mediumCount}`}
                  size="small"
                  onClick={() => setFilterSeverity(filterSeverity === "medium" ? "all" : "medium")}
                  sx={{
                    height: 20,
                    fontSize: "11px",
                    cursor: "pointer",
                    bgcolor: filterSeverity === "medium" ? "#eab308" : "transparent",
                    color: filterSeverity === "medium" ? "#000" : "#eab308",
                    border: "1px solid #eab308",
                  }}
                />
                <Chip
                  label={`Low/Info: ${audit.lowCount + audit.infoCount}`}
                  size="small"
                  onClick={() => setFilterSeverity(filterSeverity === "low" ? "all" : "low")}
                  sx={{
                    height: 20,
                    fontSize: "11px",
                    cursor: "pointer",
                    bgcolor: filterSeverity === "low" ? "var(--line)" : "transparent",
                    color: "var(--fg-muted)",
                    border: "1px solid var(--line)",
                  }}
                />

                <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setOnlyReachable(!onlyReachable)}
                    sx={{
                      height: 20,
                      fontSize: "11px",
                      textTransform: "none",
                      px: 1,
                      borderRadius: "4px",
                      border: onlyReachable ? "1px solid #ef4444" : "1px solid var(--line)",
                      color: onlyReachable ? "#ef4444" : "var(--fg-muted)",
                      bgcolor: onlyReachable ? "rgba(239, 68, 68, 0.1)" : "transparent",
                    }}
                  >
                    Reachable Sinks ({findings.filter((f) => f.isReachable).length})
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setFilterSeverity("all");
                      setFilterCategory("all");
                      setOnlyReachable(false);
                    }}
                    sx={{
                      height: 20,
                      fontSize: "11px",
                      textTransform: "none",
                      px: 0.75,
                      color: "var(--fg-muted)",
                    }}
                  >
                    Reset
                  </Button>
                </Box>
              </Box>
            )}

            {/* Findings Table */}
            {filtered.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography sx={{ fontSize: "12px", color: "var(--fg-muted)" }}>
                  {findings.length === 0
                    ? "No security vulnerabilities or loopholes detected in this repository."
                    : "No findings match the current filter criteria."}
                </Typography>
              </Box>
            ) : (
              <Table size="small" sx={{ borderCollapse: "collapse", width: "100%" }}>
                <TableHead sx={{ bgcolor: "var(--surface)", position: "sticky", top: 0, zIndex: 1 }}>
                  <TableRow sx={{ height: 24, borderBottom: "1px solid var(--line)" }}>
                    <TableCell sx={{ width: 80, fontSize: "10px", color: "var(--fg-muted)", borderColor: "var(--line)", py: 0.5, px: 1.5 }}>
                      Severity
                    </TableCell>
                    <TableCell sx={{ fontSize: "10px", color: "var(--fg-muted)", borderColor: "var(--line)", py: 0.5, px: 1.5 }}>
                      Finding / Rule
                    </TableCell>
                    <TableCell sx={{ fontSize: "10px", color: "var(--fg-muted)", borderColor: "var(--line)", py: 0.5, px: 1.5 }}>
                      File & Line
                    </TableCell>
                    <TableCell sx={{ width: 90, fontSize: "10px", color: "var(--fg-muted)", borderColor: "var(--line)", py: 0.5, px: 1.5 }}>
                      Reachable
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((item, index) => {
                    const rowKey = item.id ?? `${item.filePath}-${item.lineNumber}-${index}`;
                    const isExpanded = expandedId === rowKey;
                    return (
                      <TableRow
                        key={rowKey}
                        onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                        sx={{
                          cursor: "pointer",
                          height: 28,
                          borderBottom: "1px solid var(--line)",
                          "&:hover": { bgcolor: "var(--raised)" },
                        }}
                      >
                        <TableCell sx={{ borderColor: "var(--line)", py: 0.5, px: 1.5 }}>
                          <SeverityBadge severity={item.severity} />
                        </TableCell>
                        <TableCell sx={{ borderColor: "var(--line)", py: 0.5, px: 1.5 }}>
                          <Typography sx={{ fontSize: "11px", fontWeight: 500, color: "var(--fg)" }}>
                            {item.title}
                          </Typography>
                          {isExpanded && (
                            <Box sx={{ mt: 0.75, pb: 0.5 }}>
                              <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)", mb: 0.5 }}>
                                {item.description}
                              </Typography>
                              {item.codeSnippet && item.codeSnippet.trim().length > 0 && (
                                <Box
                                  component="pre"
                                  sx={{
                                    p: 1,
                                    borderRadius: "4px",
                                    bgcolor: "var(--canvas)",
                                    border: "1px solid var(--line)",
                                    fontFamily: "var(--font-geist-mono), monospace",
                                    fontSize: "11px",
                                    overflowX: "auto",
                                    m: 0,
                                  }}
                                >
                                  {item.codeSnippet.trim()}
                                </Box>
                              )}
                              {item.isReachable && item.reachabilityChain.length > 0 && (
                                <Box sx={{ mt: 0.75, fontSize: "10px", color: "#ef4444" }}>
                                  <Typography sx={{ fontSize: "10px", fontWeight: 600 }}>
                                    Route Taint Path:
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontFamily: "var(--font-geist-mono), monospace",
                                      fontSize: "10px",
                                    }}
                                  >
                                    {item.reachabilityChain.join(" → ")}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ borderColor: "var(--line)", py: 0.5, px: 1.5 }}>
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
                        <TableCell sx={{ borderColor: "var(--line)", py: 0.5, px: 1.5 }}>
                          {item.isReachable ? (
                            <Typography sx={{ fontSize: "10px", color: "#ef4444", fontWeight: 600 }}>
                              Reachable
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)" }}>
                              Internal
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
        )}
      </DialogContent>

      {/* Dialog Footer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          borderTop: "1px solid var(--line)",
        }}
      >
        <Link
          href={`/analyses/${analysisId}/audit`}
          style={{ textDecoration: "none" }}
          onClick={onClose}
        >
          <Button
            size="small"
            sx={{
              fontSize: "11px",
              height: 24,
              textTransform: "none",
              color: "var(--accent)",
              border: "1px solid var(--line)",
              px: 1,
              "&:hover": { bgcolor: "var(--raised)" },
            }}
          >
            Open Dedicated Page ↗
          </Button>
        </Link>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            onClick={onRerun}
            disabled={loading}
            sx={{
              fontSize: "11px",
              height: 24,
              textTransform: "none",
              color: "var(--fg)",
              border: "1px solid var(--line)",
              px: 1,
              "&:hover": { bgcolor: "var(--raised)" },
            }}
          >
            Re-scan
          </Button>
          <Button
            size="small"
            onClick={onClose}
            sx={{
              fontSize: "11px",
              height: 24,
              textTransform: "none",
              bgcolor: "var(--fg)",
              color: "var(--surface)",
              px: 1.25,
              "&:hover": { opacity: 0.9 },
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Dialog>
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
        py: 0.15,
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
