"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

export interface GenerationTimerProps {
  expectedSeconds?: number;
  status?: "loading" | "done" | "idle" | "error";
  className?: string;
}

/**
 * Live generation timer placed at the top-right of AI drawers and panels.
 * Displays the expected completion baseline and active elapsed seconds.
 */
export function GenerationTimer({
  expectedSeconds = 3,
  status = "loading",
  className,
}: GenerationTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== "loading") return;

    const start = performance.now();
    const timer = setInterval(() => {
      setElapsed((performance.now() - start) / 1000);
    }, 100);

    return () => clearInterval(timer);
  }, [status]);

  if (status !== "loading") return null;

  return (
    <Box
      className={className}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.6,
        px: 1,
        py: 0.25,
        borderRadius: "4px",
        bgcolor: "var(--raised)",
        border: "1px solid var(--line)",
        fontSize: "10px",
        fontFamily: "var(--font-geist-mono), monospace",
        color: "var(--fg-muted)",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <AccessTimeIcon sx={{ fontSize: "11px", opacity: 0.7 }} />
      <Box component="span">expected: ~{expectedSeconds}s</Box>
      <Box component="span" sx={{ opacity: 0.3 }}>|</Box>
      <Box component="span" sx={{ color: "var(--fg)" }}>{elapsed.toFixed(1)}s</Box>
    </Box>
  );
}
