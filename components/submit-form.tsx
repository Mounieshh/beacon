"use client";

import { useActionState } from "react";
import { Box, Button, InputBase, Typography } from "@mui/material";
import { submitAnalysis, type FormState } from "@/app/(workspace)/actions";

const INITIAL: FormState = { error: null };

export function SubmitForm() {
  const [state, action, pending] = useActionState(submitAnalysis, INITIAL);

  return (
    <Box component="form" action={action} sx={{ display: "flex", minWidth: 0, alignItems: "center", gap: 1 }}>
      <InputBase
        name="url"
        required
        autoComplete="off"
        inputProps={{
          spellCheck: false,
          "aria-label": "Public GitHub repository URL",
          "aria-invalid": state.error ? true : undefined,
        }}
        placeholder="github.com/owner/repo"
        sx={{
          height: 24,
          width: { xs: 200, sm: 288 },
          minWidth: 0,
          borderRadius: "4px",
          border: "1px solid var(--line)",
          bgcolor: "var(--canvas)",
          px: 1,
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "12px",
          color: "var(--fg)",
          "& .MuiInputBase-input": {
            p: 0,
            fontSize: "12px",
            fontFamily: "var(--font-geist-mono), monospace",
            color: "var(--fg)",
            "&::placeholder": {
              color: "var(--fg-muted)",
              opacity: 1,
            },
          },
          "&.Mui-focused": {
            borderColor: "var(--accent)",
          },
        }}
      />
      <Button
        type="submit"
        disabled={pending}
        size="small"
        sx={{
          height: 24,
          flexShrink: 0,
          borderRadius: "4px",
          bgcolor: "var(--accent)",
          color: "var(--accent-fg)",
          px: 1,
          fontSize: "12px",
          fontWeight: 500,
          textTransform: "none",
          minWidth: "auto",
          boxShadow: "none",
          "&:hover": {
            bgcolor: "var(--accent)",
            opacity: 0.9,
            boxShadow: "none",
          },
          "&.Mui-disabled": {
            opacity: 0.6,
            color: "var(--accent-fg)",
            bgcolor: "var(--accent)",
          },
        }}
      >
        {pending ? "Starting…" : "Analyse"}
      </Button>
      {state.error && (
        <Typography
          role="alert"
          component="span"
          sx={{
            fontSize: "12px",
            color: "var(--fg)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {state.error}
        </Typography>
      )}
    </Box>
  );
}
