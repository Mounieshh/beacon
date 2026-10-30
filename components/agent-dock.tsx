"use client";

import { useState, useTransition } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { SubmissionStatus } from "@/lib/issue-agent/types";
import { createRepositoryIssueAction } from "@/app/(workspace)/analyses/[id]/issue-actions";

type Props = {
  analysisId?: string;
  contextPage?: string;
};

export function AgentWidget({ analysisId, contextPage }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [targetFile, setTargetFile] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>({ state: "idle" });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isPending) return;

    setStatus({ state: "submitting" });

    startTransition(async () => {
      const page =
        contextPage ||
        (typeof window !== "undefined" ? window.location.pathname : undefined);

      const result = await createRepositoryIssueAction({
        prompt: prompt.trim(),
        activeFile: targetFile.trim() || undefined,
        analysisId,
        contextPage: page,
        errorStack: errorDetails.trim() || undefined,
      });

      if (result.ok) {
        setStatus({
          state: "created",
          issueNumber: result.issueNumber,
          issueUrl: result.issueUrl,
          prBranch: result.prBranch,
          simulated: result.simulated,
        });
        setPrompt("");
        setErrorDetails("");
      } else {
        setStatus({ state: "error", message: result.error });
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    if (status.state === "created" || status.state === "error") {
      setStatus({ state: "idle" });
    }
  };

  return (
    <>
      {/* Floating Widget Button at Bottom Right */}
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
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: "9999px",
            bgcolor: "var(--accent, #2563eb)",
            color: "#ffffff",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            textTransform: "none",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
            "&:hover": {
              bgcolor: "var(--accent-hover, #1d4ed8)",
              transform: "translateY(-1px)",
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)",
            },
          }}
        >
          <Box component="span" sx={{ fontSize: "16px", lineHeight: 1 }}>
            🤖
          </Box>
          <Box component="span">Report Dev Issue</Box>
        </Button>
      </Box>

      {/* Right-Side Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 440 },
              bgcolor: "var(--surface)",
              color: "var(--fg)",
              borderLeft: "1px solid var(--line)",
              boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.2)",
              p: 3,
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 2 }}
        >
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "16px", fontWeight: 600, color: "var(--fg)" }}>
                  Beacon Dev Fixer
                </Typography>
                <Box
                  component="span"
                  sx={{
                    fontSize: "11px",
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: "var(--line)",
                    color: "var(--fg-muted)",
                    fontFamily: "monospace",
                  }}
                >
                  Mounieshh/beacon
                </Box>
              </Box>
              <Typography sx={{ fontSize: "12px", color: "var(--fg-muted)", mt: 0.5 }}>
                Report an issue in Beacon. A GitHub Issue will be opened and CI will prepare an automated fix PR.
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{ color: "var(--fg-muted)", mt: -0.5, mr: -0.5 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ height: "1px", bgcolor: "var(--line)", width: "100%" }} />

          {/* Target File Input */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography sx={{ fontSize: "12px", fontWeight: 500, color: "var(--fg)" }}>
              Target File in Beacon (Optional)
            </Typography>
            <TextField
              size="small"
              placeholder="e.g. components/analysis-view.tsx or components/shell.tsx"
              value={targetFile}
              onChange={(e) => setTargetFile(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: "12px",
                  bgcolor: "var(--canvas)",
                  color: "var(--fg)",
                  border: "1px solid var(--line)",
                  borderRadius: 1,
                  fontFamily: "monospace",
                },
              }}
            />
          </Box>

          {/* Description Field */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography sx={{ fontSize: "12px", fontWeight: 500, color: "var(--fg)" }}>
              Error Description / What to Fix *
            </Typography>
            <TextField
              required
              fullWidth
              multiline
              rows={4}
              size="small"
              placeholder="Describe the bug or unexpected behavior in Beacon (e.g. 'Dependency map pan stops responding after opening detail drawer')..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={status.state === "submitting"}
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: "12px",
                  bgcolor: "var(--canvas)",
                  color: "var(--fg)",
                  border: "1px solid var(--line)",
                  borderRadius: 1,
                },
              }}
            />
          </Box>

          {/* Error Details / Logs */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography sx={{ fontSize: "12px", fontWeight: 500, color: "var(--fg)" }}>
              Console Stack / Error Details (Optional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="Paste any error trace or console output..."
              value={errorDetails}
              onChange={(e) => setErrorDetails(e.target.value)}
              disabled={status.state === "submitting"}
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: "11px",
                  bgcolor: "var(--canvas)",
                  color: "var(--fg)",
                  border: "1px solid var(--line)",
                  borderRadius: 1,
                  fontFamily: "monospace",
                },
              }}
            />
          </Box>

          {/* Status Feedback */}
          {status.state === "created" && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                fontSize: "12px",
              }}
            >
              <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#16a34a" }}>
                Issue #{status.issueNumber} opened on GitHub!
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "var(--fg)", mt: 0.5 }}>
                {status.simulated ? (
                  <span>[Dev Simulation] GitHub Actions would pick up <code>{status.prBranch}</code> in Beacon.</span>
                ) : (
                  <span>
                    Track issue:{" "}
                    <a
                      href={status.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#3b82f6", textDecoration: "underline" }}
                    >
                      {status.issueUrl}
                    </a>
                    . CI resolver started in <strong>beacon</strong>.
                  </span>
                )}
              </Typography>
            </Box>
          )}

          {status.state === "error" && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontSize: "12px",
                color: "#dc2626",
              }}
            >
              Failed to submit: {status.message}
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {/* Footer Actions */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1.5, pt: 2, borderTop: "1px solid var(--line)" }}>
            <Button
              onClick={handleClose}
              sx={{ fontSize: "12px", textTransform: "none", color: "var(--fg-muted)" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!prompt.trim() || status.state === "submitting"}
              sx={{
                fontSize: "12px",
                textTransform: "none",
                bgcolor: "var(--accent, #2563eb)",
                px: 2,
                "&:hover": { bgcolor: "var(--accent-hover, #1d4ed8)" },
              }}
            >
              {status.state === "submitting" ? (
                <>
                  <CircularProgress size={14} sx={{ color: "white", mr: 1 }} />
                  Creating Issue &amp; Dispatching CI...
                </>
              ) : (
                "File Issue & Trigger CI Fix"
              )}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}

// Export both names for backwards compatibility
export const AgentDock = AgentWidget;
