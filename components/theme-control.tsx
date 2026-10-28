"use client";

import { useState } from "react";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import { THEME_COOKIE, THEMES, type Theme } from "@/lib/theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeControl({ initial, height = 24 }: { initial: Theme; height?: number }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(_: React.MouseEvent<HTMLElement>, next: Theme | null) {
    if (!next) return;
    setTheme(next);
    applyTheme(next);
  }

  return (
    <ToggleButtonGroup
      value={theme}
      exclusive
      onChange={choose}
      aria-label="Theme"
      size="small"
      sx={{
        height,
        border: "1px solid var(--line)",
        borderRadius: "6px",
        "& .MuiToggleButtonGroup-grouped": {
          border: 0,
          borderRadius: 0,
          px: 1,
          py: 0,
          height: "100%",
          fontSize: "11px",
          textTransform: "none",
          fontWeight: 400,
          color: "var(--fg-muted)",
          "&.Mui-selected": {
            bgcolor: "var(--raised)",
            color: "var(--fg)",
            fontWeight: 500,
          },
          "&:hover": {
            bgcolor: "var(--raised)",
            color: "var(--fg)",
          },
        },
      }}
    >
      {THEMES.map((t) => (
        <ToggleButton key={t} value={t} aria-label={t}>
          {t}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
