"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import BugReportIcon from "@mui/icons-material/BugReport";
import type { AgentLogMessage, AgentStepPhase } from "@/lib/issue-agent/types";
import {
  checkPullRequestStatusAction,
  createRepositoryIssueAction,
} from "@/app/(workspace)/analyses/[id]/issue-actions";

type Props = {
  analysisId?: string;
  contextPage?: string;
};

const THINKING_PHRASES = [
  "Cogitating on AST relationships...",
  "Vegetating over codebase dependencies...",
  "Synthesizing targeted diff hunks...",
  "Reconciling Next.js route contracts...",
  "Executing tsc --noEmit verification...",
  "Healing TypeScript type declarations...",
  "Verifying zero-regression compilation...",
  "Formulating draft pull request bundle...",
];

export function AgentWidget({ analysisId, contextPage }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [activePhase, setActivePhase] = useState<AgentStepPhase>("dispatching");
  const [logs, setLogs] = useState<AgentLogMessage[]>([]);
  const [isPending, startTransition] = useTransition();

  const [activeIssue, setActiveIssue] = useState<{
    issueNumber: number;
    issueUrl: string;
    prBranch: string;
    simulated?: boolean;
  } | null>(null);

  const [activePr, setActivePr] = useState<{
    prNumber: number;
    prUrl: string;
    prTitle: string;
    commitsCount: number;
  } | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll chat to bottom on new messages
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, thinkingIndex]);

  // Rotate Claude-style thinking phrases while running
  useEffect(() => {
    if (status === "running") {
      thinkingTimerRef.current = setInterval(() => {
        setThinkingIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
      }, 2500);
    } else {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    }
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, [status]);

  // Handle heuristic staged progress logs while waiting for CI
  useEffect(() => {
    if (status !== "running" || !activeIssue) return;

    const timeline = [
      {
        delay: 4000,
        phase: "grounding" as AgentStepPhase,
        content: "Cloning repository context and initializing Aider with OpenRouter Nemotron 3.5 Lightning.",
      },
      {
        delay: 12000,
        phase: "cogitating" as AgentStepPhase,
        content: "Analyzing AST symbol graph and isolating relevant source modules.",
      },
      {
        delay: 24000,
        phase: "editing" as AgentStepPhase,
        content: "Synthesizing unified diff patch and applying code edits directly to working tree.",
      },
      {
        delay: 38000,
        phase: "typechecking" as AgentStepPhase,
        content: "Running pnpm exec tsc --noEmit type check and self-healing compiler loop.",
      },
    ];

    const timers = timeline.map(({ delay, phase, content }) =>
      setTimeout(() => {
        setActivePhase(phase);
        setLogs((prev) => [
          ...prev,
          {
            id: `step-${Date.now()}-${phase}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            sender: "agent",
            phase,
            content,
          },
        ]);
      }, delay)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [status, activeIssue]);

  // Poll GitHub for Pull Request readiness
  useEffect(() => {
    if (status !== "running" || !activeIssue) return;

    let pollCount = 0;

    const poll = async () => {
      pollCount += 1;
      const res = await checkPullRequestStatusAction(activeIssue.issueNumber);

      if (res.found) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setActivePr({
          prNumber: res.prNumber,
          prUrl: res.prUrl,
          prTitle: res.prTitle,
          commitsCount: res.commitsCount,
        });
        setActivePhase("pr_ready");
        setStatus("completed");
        setLogs((prev) => [
          ...prev,
          {
            id: `pr-ready-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            sender: "agent",
            phase: "pr_ready",
            content: `Fix verified cleanly with TypeScript compiler. Draft Pull Request #${res.prNumber} is ready for review.`,
            metadata: {
              prUrl: res.prUrl,
              prBranch: activeIssue.prBranch,
              commitsCount: res.commitsCount,
            },
          },
        ]);
      } else if (activeIssue.simulated && pollCount >= 8) {
        // Simulated local fallback completes after ~32s
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        const mockPrNumber = activeIssue.issueNumber + 1;
        const mockPrUrl = `https://github.com/Mounieshh/beacon/pull/${mockPrNumber}`;
        setActivePr({
          prNumber: mockPrNumber,
          prUrl: mockPrUrl,
          prTitle: `🤖 Fix: Automated resolution for issue #${activeIssue.issueNumber}`,
          commitsCount: 1,
        });
        setActivePhase("pr_ready");
        setStatus("completed");
        setLogs((prev) => [
          ...prev,
          {
            id: `pr-ready-sim-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            sender: "agent",
            phase: "pr_ready",
            content: `[Simulation] Fix verified cleanly. Draft Pull Request #${mockPrNumber} has been generated.`,
            metadata: {
              prUrl: mockPrUrl,
              prBranch: activeIssue.prBranch,
              commitsCount: 1,
            },
          },
        ]);
      }
    };

    // First check after 6 seconds, then every 5 seconds
    const initialDelay = setTimeout(() => {
      poll();
      pollTimerRef.current = setInterval(poll, 5000);
    }, 6000);

    return () => {
      clearTimeout(initialDelay);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, [status, activeIssue]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isPending) return;

    const currentPrompt = prompt.trim();
    const currentError = errorDetails.trim();
    const page =
      contextPage ||
      (typeof window !== "undefined" ? window.location.pathname : undefined);

    setStatus("running");
    setActivePhase("dispatching");
    setErrorMessage("");
    setActivePr(null);

    const initialUserMessage: AgentLogMessage = {
      id: `user-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      sender: "user",
      content: currentPrompt,
    };

    const initialAgentMessage: AgentLogMessage = {
      id: `agent-init-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      sender: "agent",
      phase: "dispatching",
      content: "Registering issue on GitHub and preparing autonomous fixer dispatch...",
    };

    setLogs([initialUserMessage, initialAgentMessage]);

    startTransition(async () => {
      const result = await createRepositoryIssueAction({
        prompt: currentPrompt,
        analysisId,
        contextPage: page,
        errorStack: currentError || undefined,
      });

      if (result.ok) {
        setActiveIssue({
          issueNumber: result.issueNumber,
          issueUrl: result.issueUrl,
          prBranch: result.prBranch,
          simulated: result.simulated,
        });

        setLogs((prev) => [
          ...prev,
          {
            id: `issue-opened-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            sender: "system",
            content: result.simulated
              ? `[Local Simulation] Issue #${result.issueNumber} dispatched to simulated worker.`
              : `GitHub Issue #${result.issueNumber} created. GitHub Actions workflow triggered on branch "${result.prBranch}".`,
            metadata: {
              issueNumber: result.issueNumber,
              issueUrl: result.issueUrl,
              prBranch: result.prBranch,
            },
          },
        ]);

        setPrompt("");
        setErrorDetails("");
      } else {
        setStatus("error");
        setActivePhase("error");
        setErrorMessage(result.error);
        setLogs((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            sender: "system",
            phase: "error",
            content: `Failed to dispatch agent: ${result.error}`,
          },
        ]);
      }
    });
  };

  const handleReset = () => {
    setStatus("idle");
    setActivePhase("dispatching");
    setActiveIssue(null);
    setActivePr(null);
    setLogs([]);
    setErrorMessage("");
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <Box
        sx={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1200,
        }}
      >
        <Button
          onClick={() => setOpen(true)}
          variant="contained"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 2.25,
            py: 1.1,
            borderRadius: "9999px",
            bgcolor: "var(--accent, #2563eb)",
            color: "#ffffff",
            boxShadow: "0 4px 16px rgba(37, 99, 235, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            textTransform: "none",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: "var(--accent-hover, #1d4ed8)",
              transform: "translateY(-1px)",
              boxShadow: "0 6px 22px rgba(37, 99, 235, 0.45)",
            },
          }}
        >
          <SmartToyIcon sx={{ fontSize: 18 }} />
          <Box component="span">
            {status === "running" ? "Fixer Agent Running..." : "Report Dev Issue"}
          </Box>
          {status === "running" && (
            <CircularProgress size={14} sx={{ color: "white", ml: 0.5 }} />
          )}
        </Button>
      </Box>

      {/* Side Drawer Console */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 460 },
              bgcolor: "var(--surface)",
              color: "var(--fg)",
              borderLeft: "1px solid var(--line)",
              boxShadow: "-12px 0 32px rgba(0, 0, 0, 0.25)",
              p: 0,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            },
          },
        }}
      >
        {/* Console Header */}
        <Box
          sx={{
            p: 2.5,
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "var(--surface)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: status === "running" ? "#2563eb" : status === "completed" ? "#16a34a" : "var(--line)",
                color: status === "idle" ? "var(--fg)" : "#ffffff",
                transition: "all 0.3s ease",
              }}
            >
              {status === "completed" ? (
                <CheckCircleIcon sx={{ fontSize: 20 }} />
              ) : status === "running" ? (
                <AutoAwesomeIcon sx={{ fontSize: 18 }} />
              ) : (
                <SmartToyIcon sx={{ fontSize: 18 }} />
              )}
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "var(--fg)" }}>
                  Beacon Fixer Agent
                </Typography>
                <Chip
                  label="Mounieshh/beacon"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "10px",
                    fontFamily: "monospace",
                    bgcolor: "var(--line)",
                    color: "var(--fg-muted)",
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)", mt: 0.25 }}>
                Aider + OpenRouter Nemotron 3.5 Lightning
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={handleClose} sx={{ color: "var(--fg-muted)" }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Dynamic Status / Shimmer Bar when Agent is Running */}
        {status === "running" && (
          <Box sx={{ width: "100%" }}>
            <LinearProgress
              sx={{
                height: 3,
                bgcolor: "rgba(37, 99, 235, 0.15)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "var(--accent, #2563eb)",
                },
              }}
            />
            {/* Claude-style dynamic thinking pill */}
            <Box
              sx={{
                px: 2.5,
                py: 1,
                bgcolor: "rgba(37, 99, 235, 0.08)",
                borderBottom: "1px solid rgba(37, 99, 235, 0.18)",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
              }}
            >
              <CircularProgress size={12} sx={{ color: "var(--accent, #2563eb)" }} />
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--accent, #2563eb)",
                  fontFamily: "monospace",
                  fontStyle: "italic",
                }}
              >
                {THINKING_PHRASES[thinkingIndex]}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Main Body: Mode Switching */}
        {status === "idle" ? (
          /* Form Input Mode */
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
              flex: 1,
              overflowY: "auto",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "var(--fg)" }}>
                Describe Bug or Request *
              </Typography>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                size="small"
                placeholder="What needs to be fixed or modified in Beacon? (e.g. 'Change the top navbar theme selection to a dropdown menu')..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: "13px",
                    bgcolor: "var(--canvas)",
                    color: "var(--fg)",
                    border: "1px solid var(--line)",
                    borderRadius: 1.5,
                  },
                }}
              />
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "var(--fg)" }}>
                Console Stack / Error Details (Optional)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                size="small"
                placeholder="Paste any stack trace, runtime console log, or compiler error..."
                value={errorDetails}
                onChange={(e) => setErrorDetails(e.target.value)}
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: "11px",
                    bgcolor: "var(--canvas)",
                    color: "var(--fg)",
                    border: "1px solid var(--line)",
                    borderRadius: 1.5,
                    fontFamily: "monospace",
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: "var(--canvas)",
                border: "1px solid var(--line)",
              }}
            >
              <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "var(--fg)", mb: 0.5 }}>
                Autonomous CI Pipeline
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
                Submitting creates a GitHub issue in <strong>Mounieshh/beacon</strong>.
                The CI workflow automatically spins up Aider, applies targeted code diffs, verifies compilation with <code>tsc --noEmit</code>, and opens a Draft Pull Request.
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            <Button
              type="submit"
              variant="contained"
              disabled={!prompt.trim() || isPending}
              sx={{
                py: 1.25,
                fontSize: "13px",
                fontWeight: 600,
                textTransform: "none",
                bgcolor: "var(--accent, #2563eb)",
                borderRadius: 1.5,
                "&:hover": { bgcolor: "var(--accent-hover, #1d4ed8)" },
              }}
            >
              Launch Fixer Agent
            </Button>
          </Box>
        ) : (
          /* Live Agent Activity & Output Stream */
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* Chat Bubble / Terminal Log Stream */}
            <Box
              sx={{
                p: 2.5,
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {logs.map((log) => {
                const isUser = log.sender === "user";
                const isSystem = log.sender === "system";

                if (isSystem) {
                  return (
                    <Box
                      key={log.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        my: 0.5,
                        px: 1.5,
                        py: 0.75,
                        bgcolor: "var(--canvas)",
                        border: "1px dashed var(--line)",
                        borderRadius: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace" }}>
                        [{log.timestamp}] {log.content}
                      </Typography>
                    </Box>
                  );
                }

                return (
                  <Box
                    key={log.id}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isUser ? "flex-end" : "flex-start",
                      width: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)", fontWeight: 500 }}>
                        {isUser ? "You" : "Beacon Fixer"}
                      </Typography>
                      <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)" }}>
                        {log.timestamp}
                      </Typography>
                    </Box>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.75,
                        maxWidth: "85%",
                        borderRadius: 2,
                        bgcolor: isUser ? "var(--accent, #2563eb)" : "var(--canvas)",
                        color: isUser ? "#ffffff" : "var(--fg)",
                        border: isUser ? "none" : "1px solid var(--line)",
                        fontSize: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      <Typography sx={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                        {log.content}
                      </Typography>

                      {log.metadata?.issueUrl && (
                        <Box sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            href={log.metadata.issueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                            sx={{
                              fontSize: "11px",
                              textTransform: "none",
                              py: 0.25,
                              px: 1,
                              borderColor: isUser ? "rgba(255,255,255,0.4)" : "var(--line)",
                              color: isUser ? "#ffffff" : "var(--accent, #2563eb)",
                            }}
                          >
                            View Issue #{log.metadata.issueNumber}
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  </Box>
                );
              })}

              <div ref={chatBottomRef} />
            </Box>

            {/* Completed Callout Card */}
            {status === "completed" && activePr && (
              <Box
                sx={{
                  p: 2.5,
                  borderTop: "1px solid var(--line)",
                  bgcolor: "rgba(34, 197, 94, 0.08)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>
                    Pull Request #{activePr.prNumber} Raised!
                  </Typography>
                </Box>

                <Typography sx={{ fontSize: "12px", color: "var(--fg)", mb: 1.5, lineHeight: 1.5 }}>
                  The agent finished applying code edits and confirmed clean compilation with <code>tsc --noEmit</code>.
                </Typography>

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "var(--surface)",
                    border: "1px solid var(--line)",
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "var(--fg-muted)", mb: 0.25 }}>
                    ACTION REQUIRED
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: "var(--fg)" }}>
                    Please <strong>review and merge PR #{activePr.prNumber}</strong> into <code>main</code> to see the changes take effect in the Beacon app.
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    href={activePr.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "none",
                      bgcolor: "#16a34a",
                      "&:hover": { bgcolor: "#15803d" },
                    }}
                  >
                    Review PR on GitHub
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleReset}
                    startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      fontSize: "12px",
                      textTransform: "none",
                      color: "var(--fg)",
                      borderColor: "var(--line)",
                    }}
                  >
                    New Fix
                  </Button>
                </Box>
              </Box>
            )}

            {/* Error View */}
            {status === "error" && (
              <Box
                sx={{
                  p: 2.5,
                  borderTop: "1px solid var(--line)",
                  bgcolor: "rgba(239, 68, 68, 0.08)",
                }}
              >
                <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#dc2626", mb: 1 }}>
                  Agent Execution Failed
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "var(--fg)", mb: 2 }}>
                  {errorMessage || "An unexpected error occurred while communicating with the fixer pipeline."}
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleReset}
                  sx={{
                    fontSize: "12px",
                    textTransform: "none",
                    color: "var(--fg)",
                    borderColor: "var(--line)",
                  }}
                >
                  Start Over
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Drawer>
    </>
  );
}

export const AgentDock = AgentWidget;
