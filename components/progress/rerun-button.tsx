"use client";

import { useState, useTransition } from "react";
import { Box, Button, Typography } from "@mui/material";
import { rerunAnalysis } from "@/app/(workspace)/actions";

export function RerunButton({
  analysisId,
  onStarted,
  label = "Re-run",
}: {
  analysisId: string;
  onStarted: () => void;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      {error && (
        <Typography component="span" sx={{ fontSize: "12px", color: "var(--fg-muted)" }}>
          {error}
        </Typography>
      )}
      <Button
        type="button"
        disabled={pending}
        size="small"
        onClick={() =>
          startTransition(async () => {
            const result = await rerunAnalysis(analysisId);
            setError(result.error);
            if (!result.error) onStarted();
          })
        }
        sx={{
          height: 24,
          borderRadius: "4px",
          border: "1px solid var(--line)",
          px: 1,
          py: 0,
          fontSize: "12px",
          textTransform: "none",
          fontWeight: 500,
          color: "var(--fg)",
          bgcolor: "transparent",
          minWidth: "auto",
          boxShadow: "none",
          "&:hover": {
            bgcolor: "var(--raised)",
            borderColor: "var(--line)",
            boxShadow: "none",
          },
          "&.Mui-disabled": {
            color: "var(--fg-muted)",
            borderColor: "var(--line)",
          },
        }}
      >
        {pending ? "Starting…" : label}
      </Button>
    </Box>
  );
}
