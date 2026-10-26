"use client";

import { useEffect, useState, useTransition } from "react";
import { Box, Button, Chip, IconButton, Skeleton, Typography, Tooltip } from "@mui/material";
import {
  loadStoredSolutions,
  saveStoredSolution,
  getStoredSolutionForFinding,
  MAX_GENERATION_LIMIT,
  type StoredSolutionEntry,
} from "@/lib/explanation-session";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { solveSecurityFindingAction } from "@/app/(workspace)/analyses/[id]/actions";
import type { SecurityFinding, FindingSeverity } from "@/lib/security/types";
import { GenerationTimer } from "@/components/generation-timer";

export type DrawerTab = "description" | "solution";

type SolutionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; body: string; model: string; cached: boolean }
  | { status: "error"; error: string };

export function SecurityFindingDrawer({
  finding,
  analysisId,
  initialSolution,
  activeTab,
  onTabChange,
  onSolutionSaved,
  onClose,
}: {
  finding: SecurityFinding;
  analysisId: string;
  initialSolution?: StoredSolutionEntry | null;
  activeTab?: DrawerTab;
  onTabChange?: (tab: DrawerTab) => void;
  onSolutionSaved?: (key: string, entry: StoredSolutionEntry) => void;
  onClose: () => void;
}) {
  const [internalTab, setInternalTab] = useState<DrawerTab>(activeTab ?? "description");
  const tab = activeTab ?? internalTab;
  const setTab = (newTab: DrawerTab) => {
    setInternalTab(newTab);
    onTabChange?.(newTab);
  };

  const storedEntry = initialSolution ?? getStoredSolutionForFinding(analysisId, finding);

  const [solutionState, setSolutionState] = useState<SolutionState>(() =>
    storedEntry
      ? { status: "done", body: storedEntry.body, model: storedEntry.model, cached: storedEntry.cached }
      : { status: "idle" }
  );
  const [generationCount, setGenerationCount] = useState<number>(() => storedEntry?.count ?? 0);
  const [isPending, startTransition] = useTransition();

  const findingKey = finding.id || `${finding.ruleId}:${finding.filePath}:${finding.lineNumber ?? 0}`;

  // Keep solution in sync when finding changes
  useEffect(() => {
    const entry = initialSolution ?? getStoredSolutionForFinding(analysisId, finding);
    if (entry) {
      setSolutionState({
        status: "done",
        body: entry.body,
        model: entry.model,
        cached: entry.cached,
      });
      setGenerationCount(entry.count);
    } else {
      setSolutionState({ status: "idle" });
      setGenerationCount(0);
    }
  }, [findingKey, analysisId, initialSolution, finding]);

  const handleGenerateSolution = () => {
    if (generationCount >= MAX_GENERATION_LIMIT) return;

    setSolutionState({ status: "loading" });

    startTransition(async () => {
      const result = await solveSecurityFindingAction(analysisId, {
        ruleId: finding.ruleId,
        category: finding.category,
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
        filePath: finding.filePath,
        lineNumber: finding.lineNumber,
        codeSnippet: finding.codeSnippet,
        reachabilityChain: finding.reachabilityChain,
      });

      if (result.ok) {
        const newCount = saveStoredSolution(
          analysisId,
          finding,
          { body: result.body, model: result.model, cached: result.cached },
          generationCount
        );
        const entry: StoredSolutionEntry = {
          body: result.body,
          model: result.model,
          cached: result.cached,
          count: newCount,
        };
        setGenerationCount(newCount);
        setSolutionState({
          status: "done",
          body: result.body,
          model: result.model,
          cached: result.cached,
        });
        onSolutionSaved?.(findingKey, entry);
      } else {
        setSolutionState({ status: "error", error: result.error });
      }
    });
  };

  const hasSnippet = Boolean(finding.codeSnippet && finding.codeSnippet.trim().length > 0);

  return (
    <Box
      component="aside"
      aria-label="Finding Details"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: "1px solid var(--line)",
        bgcolor: "var(--surface)",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Drawer Header matching Image 2 */}
      <Box sx={{ borderBottom: "1px solid var(--line)", px: 2, pt: 1.5, pb: 0 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase" }}>
              {finding.category.replace(/_/g, " ")}
            </Typography>
            <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "var(--fg)", lineHeight: 1.3 }}>
              {finding.title}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: "var(--fg-muted)", p: 0.5 }}>
            <CloseIcon sx={{ fontSize: "16px" }} />
          </IconButton>
        </Box>

        {/* Tab Navigation matching Image 2 exactly */}
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box role="tablist" sx={{ display: "flex", gap: 2, fontSize: "11px" }}>
            <Box
              component="button"
              type="button"
              role="tab"
              aria-selected={tab === "description"}
              onClick={() => setTab("description")}
              className={`-mb-px border-b pb-1.5 transition-colors cursor-pointer ${
                tab === "description" ? "border-accent text-fg font-medium" : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              Description
            </Box>
            <Box
              component="button"
              type="button"
              role="tab"
              aria-selected={tab === "solution"}
              onClick={() => setTab("solution")}
              className={`-mb-px border-b pb-1.5 transition-colors cursor-pointer ${
                tab === "solution" ? "border-accent text-fg font-medium" : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              Solution
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {tab === "description" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {/* Metadata Bar */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <SeverityBadge severity={finding.severity} />
              <Typography
                sx={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "11px",
                  color: "var(--fg-muted)",
                }}
              >
                {finding.ruleId}
              </Typography>
              {finding.isReachable && (
                <Chip
                  label="Reachable from boundary"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "10px",
                    fontWeight: 500,
                    bgcolor: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    borderRadius: "3px",
                  }}
                />
              )}
            </Box>

            {/* Description */}
            <Box>
              <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "var(--fg)", mb: 0.5 }}>
                Description
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
                {finding.description}
              </Typography>
            </Box>

            {/* Location */}
            <Box>
              <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "var(--fg)", mb: 0.5 }}>
                Location
              </Typography>
              <Typography
                sx={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "11px",
                  color: "var(--fg)",
                  bgcolor: "var(--canvas)",
                  p: 0.75,
                  borderRadius: "3px",
                  border: "1px solid var(--line)",
                  wordBreak: "break-all",
                }}
              >
                {finding.filePath}
                {finding.lineNumber !== null ? `:${finding.lineNumber}` : ""}
              </Typography>
            </Box>

            {/* Reachability Call Chain */}
            {finding.reachabilityChain && finding.reachabilityChain.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "var(--fg)", mb: 0.5 }}>
                  Reachability Chain (Surface Entry Point → Sink)
                </Typography>
                <Typography
                  sx={{
                    p: 1,
                    borderRadius: "4px",
                    bgcolor: "var(--canvas)",
                    border: "1px solid var(--line)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "11px",
                    color: "var(--fg-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {finding.reachabilityChain.join("  →  ")}
                </Typography>
              </Box>
            )}

            {/* Code Snippet - ONLY rendered if non-empty */}
            {hasSnippet && (
              <Box>
                <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "var(--fg)", mb: 0.5 }}>
                  Vulnerable Code Snippet
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 1.25,
                    borderRadius: "4px",
                    bgcolor: "var(--canvas)",
                    border: "1px solid var(--line)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "11px",
                    color: "var(--fg)",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    m: 0,
                  }}
                >
                  {finding.codeSnippet!.trim()}
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          /* Solution Tab (AI Integrated via OpenRouter) */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {solutionState.status === "idle" && (
              <Box sx={{ py: 1 }}>
                <Button
                  size="small"
                  onClick={handleGenerateSolution}
                  startIcon={<AutoAwesomeIcon sx={{ fontSize: "13px !important" }} />}
                  sx={{
                    fontSize: "12px",
                    height: 24,
                    textTransform: "none",
                    fontWeight: 500,
                    color: "var(--fg)",
                    bgcolor: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    px: 1.25,
                    "&:hover": {
                      bgcolor: "var(--raised)",
                      borderColor: "var(--line)",
                    },
                  }}
                >
                  Solution for the issue
                </Button>
                <Typography sx={{ mt: 1.5, fontSize: "11px", color: "var(--fg-muted)", lineHeight: 1.4 }}>
                  Generate a verified code patch and step-by-step remediation guide for this issue using the OpenRouter AI client.
                </Typography>
              </Box>
            )}

            {(solutionState.status === "loading" || isPending) && (
              <Box sx={{ py: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)" }}>
                    Generating tailored solution with OpenRouter…
                  </Typography>
                  <GenerationTimer expectedSeconds={3} status="loading" />
                </Box>
                <Skeleton variant="text" sx={{ fontSize: "12px", bgcolor: "var(--line)", opacity: 0.2 }} />
                <Skeleton variant="text" sx={{ fontSize: "12px", bgcolor: "var(--line)", opacity: 0.2 }} />
                <Skeleton variant="text" sx={{ fontSize: "12px", width: "70%", bgcolor: "var(--line)", opacity: 0.2 }} />
              </Box>
            )}

            {solutionState.status === "error" && (
              <Box sx={{ py: 1 }}>
                <Typography sx={{ fontSize: "12px", color: "#ef4444", mb: 1 }}>
                  Couldn&apos;t generate solution: {solutionState.error}
                </Typography>
                <Button
                  size="small"
                  onClick={handleGenerateSolution}
                  sx={{
                    fontSize: "11px",
                    height: 22,
                    textTransform: "none",
                    border: "1px solid var(--line)",
                    color: "var(--fg)",
                  }}
                >
                  Retry
                </Button>
              </Box>
            )}

            {solutionState.status === "done" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {generationCount >= MAX_GENERATION_LIMIT ? (
                    <Tooltip title="Only certain times will be allowed because free model is used (maximum 2 generations per item)." arrow>
                      <Box component="span" sx={{ display: "inline-block", cursor: "not-allowed" }}>
                        <Button
                          disabled
                          size="small"
                          startIcon={<AutoAwesomeIcon sx={{ fontSize: "12px !important" }} />}
                          sx={{
                            fontSize: "11px",
                            height: 22,
                            textTransform: "none",
                            color: "var(--fg-muted)",
                            border: "1px solid var(--line)",
                            px: 0.75,
                            opacity: 0.5,
                            pointerEvents: "none",
                          }}
                        >
                          Re-explain (0 remaining)
                        </Button>
                      </Box>
                    </Tooltip>
                  ) : (
                    <Button
                      size="small"
                      onClick={handleGenerateSolution}
                      startIcon={<AutoAwesomeIcon sx={{ fontSize: "12px !important" }} />}
                      sx={{
                        fontSize: "11px",
                        height: 22,
                        textTransform: "none",
                        color: "var(--fg-muted)",
                        border: "1px solid var(--line)",
                        px: 0.75,
                        "&:hover": { color: "var(--fg)", bgcolor: "var(--raised)" },
                      }}
                    >
                      Re-explain ({MAX_GENERATION_LIMIT - generationCount} remaining)
                    </Button>
                  )}
                  <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)" }}>
                    {solutionState.cached ? "cached response" : "fresh run"}
                  </Typography>
                </Box>

                <SolutionRenderer markdown={solutionState.body} />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function SolutionRenderer({ markdown }: { markdown: string }) {
  // Parse paragraphs, code blocks, and bullets cleanly
  const sections = markdown.split("\n\n");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        // Fenced code block
        if (trimmed.startsWith("```")) {
          const lines = trimmed.split("\n");
          const lang = lines[0].replace("```", "").trim();
          const code = lines.slice(1, lines[lines.length - 1].startsWith("```") ? -1 : undefined).join("\n");
          return (
            <Box
              key={idx}
              sx={{
                borderRadius: "4px",
                border: "1px solid var(--line)",
                bgcolor: "var(--canvas)",
                overflow: "hidden",
                my: 0.5,
              }}
            >
              {lang && (
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.4,
                    borderBottom: "1px solid var(--line)",
                    bgcolor: "rgba(255, 255, 255, 0.02)",
                    fontSize: "10px",
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: "var(--fg-muted)",
                  }}
                >
                  {lang}
                </Box>
              )}
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.25,
                  fontSize: "11px",
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: "var(--fg)",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {code}
              </Box>
            </Box>
          );
        }

        // Bullet points
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split("\n").filter((l) => l.trim().length > 0);
          return (
            <Box key={idx} component="ul" sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
              {items.map((it, i) => (
                <Typography key={i} component="li" sx={{ fontSize: "11px", color: "var(--fg-muted)", lineHeight: 1.4 }}>
                  {it.replace(/^[-*]\s+/, "")}
                </Typography>
              ))}
            </Box>
          );
        }

        // Regular paragraph
        return (
          <Typography key={idx} sx={{ fontSize: "11px", color: "var(--fg-muted)", lineHeight: 1.45 }}>
            {trimmed}
          </Typography>
        );
      })}
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
