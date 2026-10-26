"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { resolveOrganization } from "./actions";

export function Activate() {
  const { setActive } = useClerk();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Strict mode runs effects twice in dev; two calls could create two orgs.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    resolveOrganization()
      .then((organization) => setActive({ organization }))
      .then(() => router.replace("/"))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [setActive, router]);

  return error ? (
    <Typography sx={{ fontSize: "12px", color: "var(--fg)" }}>
      Couldn&apos;t set up an organization: {error}
    </Typography>
  ) : (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <CircularProgress size={16} sx={{ color: "var(--fg-muted)" }} />
      <Typography sx={{ fontSize: "12px", color: "var(--fg-muted)" }}>
        Setting up your organization…
      </Typography>
    </Box>
  );
}
