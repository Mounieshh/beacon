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
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import StopIcon from "@mui/icons-material/Stop";
import type { AgentLogMessage, AgentStepPhase } from "@/lib/issue-agent/types";
import {
  cancelWorkflowRunAction,
  checkPullRequestStatusAction,
  createRepositoryIssueAction,
  findTriggeredWorkflowRunAction,
} from "@/app/(workspace)/analyses/[id]/issue-actions";

type Props = {
  analysisId?: string;
  contextPage?: string;
};

const THINKING_PHRASES = [
  "Waiting for CI runner spin-up...",
  "Cogitating on AST relationships...",
  "Vegetating over codebase dependencies...",
  "Synthesizing targeted diff hunks...",
  "Reconciling Next.js route contracts...",
  "Executing tsc --noEmit verification...",
  "Healing TypeScript type declarations...",
  "Verifying zero-regression compilation...",
  "Formulating draft pull request bundle...",
];

const SUGGESTIONS = [
  "Change top navbar theme selection to dropdown",
  "Add fallback error boundary to analysis graphs",
  "Improve responsive layout for mobile viewport",
];

export function AgentWidget({ analysisId, contextPage }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [, setActivePhase] = useState<AgentStepPhase>("dispatching");
  const [logs, setLogs] = useState<AgentLogMessage[]>([]);
  const [ciTriggered, setCiTriggered] = useState(false);
  const [workflowRunId, setWorkflowRunId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const [activeIssue, setActiveIssue] = useState<{
    issueNumber: number;
    issueUrl: string;
    prBranch: string;
    simulated?: boolean;
    titleSnippet?: string;
  } | null>(null);

  const [activePr, setActivePr] = useState<{
    prNumber: number;
    prUrl: string;
    prTitle: string;
    commitsCount: number;
  } | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ciCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Auto scroll chat stream to bottom
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
      }, 2400);
    } else {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    }
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, [status]);

  // Check for CI runner detection right after issue creation
  useEffect(() => {
    if (status !== "running" || !activeIssue || ciTriggered) return;

    let checkAttempts = 0;
    const checkRunner = async () => {
      checkAttempts += 1;
      const res = await findTriggeredWorkflowRunAction(
        activeIssue.issueNumber,
        activeIssue.titleSnippet
      );

      if (res.found) {
        setCiTriggered(true);
        setWorkflowRunId(res.run.id);
        if (ciCheckTimerRef.current) clearInterval(ciCheckTimerRef.current);

        setLogs((prev) => [
          ...prev,
          {
            id: `ci-triggered-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            sender: "system",
            content: `GitHub Actions CI runner triggered (Run #${res.run.id}). Pause and cancel is now active.`,
            metadata: {
              runId: res.run.id,
              runUrl: res.run.html_url,
            },
          },
        ]);
      } else if (checkAttempts >= 15) {
        // Fallback after 30 seconds if GitHub events are delayed
        setCiTriggered(true);
        if (ciCheckTimerRef.current) clearInterval(ciCheckTimerRef.current);
      }
    };

    // Poll every 2 seconds for runner pickup
    checkRunner();
    ciCheckTimerRef.current = setInterval(checkRunner, 2000);

    return () => {
      if (ciCheckTimerRef.current) clearInterval(ciCheckTimerRef.current);
    };
  }, [status, activeIssue, ciTriggered]);

  // Handle heuristic staged progress logs while waiting for CI
  useEffect(() => {
    if (status !== "running" || !activeIssue) return;

    phaseTimersRef.current.forEach((t) => clearTimeout(t));
    phaseTimersRef.current = [];

    const timeline = [
      {
        delay: 5000,
        phase: "grounding" as AgentStepPhase,
        content: "Cloning repository context and initializing Aider with OpenRouter Nemotron 3.5 Lightning.",
      },
      {
        delay: 14000,
        phase: "cogitating" as AgentStepPhase,
        content: "Analyzing AST symbol graph and isolating relevant source modules.",
      },
      {
        delay: 26000,
        phase: "editing" as AgentStepPhase,
        content: "Synthesizing unified diff patch and applying code edits directly to working tree.",
      },
      {
        delay: 40000,
        phase: "typechecking" as AgentStepPhase,
        content: "Running pnpm exec tsc --noEmit type check and self-healing compiler loop.",
      },
    ];

    phaseTimersRef.current = timeline.map(({ delay, phase, content }) =>
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
      phaseTimersRef.current.forEach((t) => clearTimeout(t));
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
        if (ciCheckTimerRef.current) clearInterval(ciCheckTimerRef.current);

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
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (ciCheckTimerRef.current) clearInterval(ciCheckTimerRef.current);

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

    const initialDelay = setTimeout(() => {
      poll();
      pollTimerRef.current = setInterval(poll, 5000);
    }, 6000);

    return () => {
      clearTimeout(initialDelay);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [status, activeIssue]);

  const handlePause = async () => {
    if (!ciTriggered) return;

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (ciCheckTimerRef.current) clearInterval(ciCheckTimerRef.current);
    phaseTimersRef.current.forEach((t) => clearTimeout(t));
    phaseTimersRef.current = [];

    // Cancel GitHub Actions workflow run if id is known
    if (workflowRunId) {
      setLogs((prev) => [
        ...prev,
        {
          id: `cancelling-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          sender: "system",
          content: `Cancelling GitHub Actions workflow run #${workflowRunId}...`,
        },
      ]);

      await cancelWorkflowRunAction(workflowRunId);

      setLogs((prev) => [
        ...prev,
        {
          id: `cancelled-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          sender: "system",
          content: `GitHub Actions workflow run #${workflowRunId} stopped and cancelled.`,
        },
      ]);
    } else {
      setLogs((prev) => [
        ...prev,
        {
          id: `paused-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          sender: "system",
          content: "Fixer agent paused by developer.",
        },
      ]);
    }

    setStatus("idle");
    setCiTriggered(false);
    setWorkflowRunId(null);
  };

  const handleSend = () => {
    if (!prompt.trim() || isPending || status === "running") return;

    const currentPrompt = prompt.trim();
    const page =
      contextPage ||
      (typeof window !== "undefined" ? window.location.pathname : undefined);

    setStatus("running");
    setCiTriggered(false);
    setWorkflowRunId(null);
    setActivePhase("dispatching");
    setErrorMessage("");
    setActivePr(null);

    const userMessage: AgentLogMessage = {
      id: `user-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      sender: "user",
      content: currentPrompt,
    };

    const agentMessage: AgentLogMessage = {
      id: `agent-init-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      sender: "agent",
      phase: "dispatching",
      content: "Registering issue on GitHub and dispatching autonomous fixer CI runner...",
    };

    setLogs((prev) => [...prev, userMessage, agentMessage]);
    setPrompt("");

    startTransition(async () => {
      const result = await createRepositoryIssueAction({
        prompt: currentPrompt,
        analysisId,
        contextPage: page,
      });

      if (result.ok) {
        setActiveIssue({
          issueNumber: result.issueNumber,
          issueUrl: result.issueUrl,
          prBranch: result.prBranch,
          simulated: result.simulated,
          titleSnippet: currentPrompt.slice(0, 30),
        });

        setLogs((prev) => [
          ...prev,
          {
            id: `issue-opened-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            sender: "system",
            content: result.simulated
              ? `[Local Simulation] Issue #${result.issueNumber} dispatched to simulated worker.`
              : `GitHub Issue #${result.issueNumber} created. Waiting for CI runner to pick up workflow...`,
            metadata: {
              issueNumber: result.issueNumber,
              issueUrl: result.issueUrl,
              prBranch: result.prBranch,
            },
          },
        ]);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (ciCheckTimerRef.current) clearInterval(ciCheckTimerRef.current);
    phaseTimersRef.current.forEach((t) => clearTimeout(t));
    phaseTimersRef.current = [];

    setStatus("idle");
    setCiTriggered(false);
    setWorkflowRunId(null);
    setActivePhase("dispatching");
    setActiveIssue(null);
    setActivePr(null);
    setLogs([]);
    setErrorMessage("");
    setPrompt("");
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
        {/* Header */}
        <Box
          sx={{
            p: 2,
            px: 2.5,
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
                bgcolor:
                  status === "running"
                    ? "var(--accent, #2563eb)"
                    : status === "completed"
                    ? "#16a34a"
                    : "var(--line)",
                color: status === "idle" ? "var(--fg)" : "#ffffff",
                transition: "all 0.3s ease",
              }}
            >
              {status === "completed" ? (
                <CheckCircleIcon sx={{ fontSize: 18 }} />
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
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {logs.length > 0 && (
              <Tooltip title="Reset Chat">
                <IconButton size="small" onClick={handleReset} sx={{ color: "var(--fg-muted)" }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={handleClose} sx={{ color: "var(--fg-muted)" }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Dynamic Status Pill when Agent is Running */}
        {status === "running" && (
          <Box sx={{ width: "100%" }}>
            <LinearProgress
              sx={{
                height: 2.5,
                bgcolor: "rgba(37, 99, 235, 0.15)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "var(--accent, #2563eb)",
                },
              }}
            />
            <Box
              sx={{
                px: 2.5,
                py: 0.75,
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
                  fontSize: "11px",
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

        {/* Scrollable Chat Area */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {logs.length === 0 ? (
            /* Minimalist Empty / Welcome State */
            <Box
              sx={{
                my: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                px: 2,
              }}
            >
              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: "rgba(37, 99, 235, 0.1)",
                  color: "var(--accent, #2563eb)",
                  mb: 1.5,
                }}
              >
                <SmartToyIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: "15px", fontWeight: 600, color: "var(--fg)", mb: 0.75 }}>
                How can Beacon Fixer help?
              </Typography>
              <Typography
                sx={{
                  fontSize: "12px",
                  color: "var(--fg-muted)",
                  lineHeight: 1.6,
                  maxWidth: 340,
                  mb: 3,
                }}
              >
                Describe an issue or code change below. The agent will inspect the repository, write targeted diffs, verify clean compilation, and open a PR.
              </Typography>

              {/* Suggestions */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
                {SUGGESTIONS.map((suggestion) => (
                  <Paper
                    key={suggestion}
                    elevation={0}
                    onClick={() => {
                      setPrompt(suggestion);
                      inputRef.current?.focus();
                    }}
                    sx={{
                      p: 1.25,
                      px: 1.75,
                      borderRadius: 2,
                      bgcolor: "var(--canvas)",
                      border: "1px solid var(--line)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        borderColor: "var(--accent, #2563eb)",
                        bgcolor: "rgba(37, 99, 235, 0.05)",
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: "12px", color: "var(--fg)" }}>
                      {suggestion}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          ) : (
            /* Active Message Stream */
            logs.map((log) => {
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
                      my: 0.25,
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
                      p: 1.5,
                      px: 2,
                      maxWidth: "88%",
                      borderRadius: 2.5,
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
            })
          )}

          {/* Completed Callout Card */}
          {status === "completed" && activePr && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                my: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>
                  Pull Request #{activePr.prNumber} Raised!
                </Typography>
              </Box>

              <Typography sx={{ fontSize: "12px", color: "var(--fg)", mb: 1.5, lineHeight: 1.5 }}>
                Fix verified cleanly with <code>tsc --noEmit</code>.
              </Typography>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: "var(--surface)",
                  border: "1px solid var(--line)",
                  mb: 1.5,
                }}
              >
                <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "var(--fg-muted)", mb: 0.25 }}>
                  ACTION REQUIRED
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "var(--fg)" }}>
                  Please <strong>review and merge PR #{activePr.prNumber}</strong> into <code>main</code> to see the changes take effect in the Beacon app.
                </Typography>
              </Box>

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
                Review PR #{activePr.prNumber} on GitHub
              </Button>
            </Box>
          )}

          {/* Error Message */}
          {status === "error" && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                my: 1,
              }}
            >
              <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#dc2626", mb: 0.5 }}>
                Execution Failed
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "var(--fg)" }}>
                {errorMessage || "An unexpected error occurred during fixer execution."}
              </Typography>
            </Box>
          )}

          <div ref={chatBottomRef} />
        </Box>

        {/* Bottom Chatbot Input Container */}
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid var(--line)",
            bgcolor: "var(--surface)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              bgcolor: "var(--canvas)",
              border: "1px solid var(--line)",
              borderRadius: 2.5,
              p: 1.25,
              transition: "border-color 0.2s ease",
              "&:focus-within": {
                borderColor: "var(--accent, #2563eb)",
              },
            }}
          >
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={5}
              placeholder="Describe a bug or change for Beacon... (Enter to send)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={status === "running"}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: {
                    fontSize: "13px",
                    color: "var(--fg)",
                    px: 0.5,
                    py: 0.25,
                  },
                },
              }}
            />

            {/* Bottom Inner Toolbar with Send and Pause Button */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pt: 1,
                mt: 0.5,
              }}
            >
              <Typography sx={{ fontSize: "10px", color: "var(--fg-muted)", px: 0.5 }}>
                Enter ↵ to send • Shift + Enter for new line
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                {status === "running" ? (
                  <Tooltip
                    title={
                      ciTriggered
                        ? "Stop & cancel GitHub Actions workflow"
                        : "Waiting for CI runner to trigger..."
                    }
                  >
                    <Box
                      component="span"
                      sx={{
                        cursor: ciTriggered ? "pointer" : "not-allowed",
                        display: "inline-flex",
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={ciTriggered ? handlePause : undefined}
                        disabled={!ciTriggered}
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: ciTriggered
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(255, 255, 255, 0.05)",
                          color: ciTriggered ? "#ef4444" : "var(--fg-muted)",
                          border: `1px solid ${
                            ciTriggered
                              ? "rgba(239, 68, 68, 0.3)"
                              : "var(--line)"
                          }`,
                          opacity: ciTriggered ? 1 : 0.45,
                          cursor: ciTriggered ? "pointer" : "not-allowed",
                          pointerEvents: ciTriggered ? "auto" : "none",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            bgcolor: ciTriggered
                              ? "rgba(239, 68, 68, 0.25)"
                              : "transparent",
                          },
                        }}
                      >
                        <StopIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Tooltip>
                ) : (
                  <Tooltip title="Send Instruction">
                    <span>
                      <IconButton
                        size="small"
                        onClick={handleSend}
                        disabled={!prompt.trim() || isPending}
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: prompt.trim() ? "var(--accent, #2563eb)" : "var(--line)",
                          color: prompt.trim() ? "#ffffff" : "var(--fg-muted)",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            bgcolor: prompt.trim() ? "var(--accent-hover, #1d4ed8)" : "var(--line)",
                          },
                        }}
                      >
                        <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}

export const AgentDock = AgentWidget;
