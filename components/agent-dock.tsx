"use client";

import { useState, useTransition } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { SubmissionStatus } from "@/lib/issue-agent/types";
import { createRepositoryIssueAction } from "@/app/(workspace)/analyses/[id]/issue-actions";

type Props = {
  analysisId: string;
  repository: { owner?: string; name: string };
  commitSha: string;
  selectedFile?: string | null;
};

export function AgentDock({
  analysisId,
  repository,
  commitSha,
  selectedFile,
}: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>({ state: "idle" });
  const [isPending, startTransition] = useTransition();

  const repoOwner = repository.owner || "unknown";
  const repoName = repository.name;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isPending) return;

    setStatus({ state: "submitting" });

    startTransition(async () => {
      const result = await createRepositoryIssueAction({
        analysisId,
        repository: { owner: repoOwner, name: repoName },
        commitSha,
        prompt: prompt.trim(),
        activeFile: selectedFile || undefined,
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
      } else {
        setStatus({ state: "error", message: result.error });
      }
    });
  };

  return (
    <Box
      component="section"
      aria-label="Beacon AI Agent Dock"
      sx={{
        borderTop: "1px solid var(--line)",
        bgcolor: "var(--surface)",
        px: 2,
        py: open ? 1.5 : 1,
        transition: "all 0.15s ease",
        zIndex: 10,
      }}
    >
      {!open ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flex: 1,
              cursor: "pointer",
            }}
            onClick={() => setOpen(true)}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: "50%",
                bgcolor: "var(--accent-subtle, rgba(59, 130, 246, 0.15))",
                color: "var(--accent, #3b82f6)",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              🤖
            </Box>
            <Typography
              component="span"
              sx={{
                fontSize: "12px",
                color: "var(--fg-muted)",
                userSelect: "none",
              }}
            >
              Have Beacon AI file a GitHub issue and trigger a CI pull request...
            </Typography>
            {selectedFile && (
              <Box
                component="span"
                sx={{
                  fontSize: "11px",
                  px: 1,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: "var(--line)",
                  color: "var(--fg)",
                  fontFamily: "monospace",
                }}
              >
                Target: {selectedFile}
              </Box>
            )}
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setOpen(true)}
            sx={{
              fontSize: "11px",
              textTransform: "none",
              borderColor: "var(--line)",
              color: "var(--fg)",
              py: 0.25,
              px: 1.25,
            }}
          >
            Open Dock
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "var(--fg)" }}>
                Beacon Agent Dock
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)" }}>
                Creates GitHub Issue &rarr; Dispatches CI Agent &rarr; Opens Pull Request
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => {
                setOpen(false);
                if (status.state === "created" || status.state === "error") {
                  setStatus({ state: "idle" });
                }
              }}
              sx={{ color: "var(--fg-muted)", p: 0.5 }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", fontSize: "11px" }}>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: "var(--line)",
                color: "var(--fg)",
                fontFamily: "monospace",
              }}
            >
              repo: {repoOwner}/{repoName}
            </Box>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: "var(--line)",
                color: "var(--fg)",
                fontFamily: "monospace",
              }}
            >
              sha: {commitSha.slice(0, 7)}
            </Box>
            {selectedFile && (
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: "rgba(59, 130, 246, 0.15)",
                  color: "#3b82f6",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  fontFamily: "monospace",
                }}
              >
                focus: {selectedFile}
              </Box>
            )}
          </Box>

          <TextField
            autoFocus
            fullWidth
            multiline
            rows={2}
            size="small"
            placeholder={
              selectedFile
                ? `Describe what needs to be fixed or improved in ${selectedFile}...`
                : "Describe the bug, architectural issue, or test to generate..."
            }
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

          {status.state === "created" && (
            <Box
              sx={{
                p: 1.2,
                borderRadius: 1,
                bgcolor: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                fontSize: "12px",
                color: "var(--fg)",
              }}
            >
              <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>
                Issue #{status.issueNumber} created successfully!
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "var(--fg-muted)", mt: 0.5 }}>
                {status.simulated ? (
                  <span>[Dev Simulation] Configured GitHub workflow would pick up <code>{status.prBranch}</code>.</span>
                ) : (
                  <span>
                    View at{" "}
                    <a
                      href={status.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#3b82f6", textDecoration: "underline" }}
                    >
                      {status.issueUrl}
                    </a>
                    . CI agent runner triggered to create PR.
                  </span>
                )}
              </Typography>
            </Box>
          )}

          {status.state === "error" && (
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontSize: "11px",
                color: "#dc2626",
              }}
            >
              Failed to submit: {status.message}
            </Box>
          )}

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
            <Button
              size="small"
              onClick={() => setOpen(false)}
              sx={{ fontSize: "11px", textTransform: "none", color: "var(--fg-muted)" }}
            >
              Close
            </Button>
            <Button
              type="submit"
              size="small"
              variant="contained"
              disabled={!prompt.trim() || status.state === "submitting"}
              sx={{
                fontSize: "11px",
                textTransform: "none",
                bgcolor: "var(--accent, #2563eb)",
                "&:hover": { bgcolor: "var(--accent-hover, #1d4ed8)" },
              }}
            >
              {status.state === "submitting" ? (
                <>
                  <CircularProgress size={12} sx={{ color: "white", mr: 1 }} />
                  Creating Issue &amp; CI Task...
                </>
              ) : (
                "Create Issue & Trigger CI PR"
              )}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
