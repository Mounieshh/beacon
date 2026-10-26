"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { useOrganization } from "@clerk/nextjs";
import { RerunButton } from "./progress/rerun-button";
import { SecurityActionCluster } from "./security/security-action-cluster";

// Above the shell, not in it: the map's columns stay where they are. Re-running
// hands the page back to the progress view, which the server renders once the
// row says running.
export function AnalysisHeader({
  analysisId,
  repository,
  commitSha,
}: {
  analysisId: string;
  repository: { owner: string; name: string };
  commitSha: string;
}) {
  const router = useRouter();
  const { organization } = useOrganization();

  const projectsUrl = organization
    ? `/dashboard/organization/${encodeURIComponent(organization.slug || organization.name)}/projects`
    : "/dashboard/organizations";

  return (
    <Box
      sx={{
        display: "flex",
        height: 36,
        flexShrink: 0,
        alignItems: "center",
        gap: 1.5,
        borderBottom: "1px solid var(--line)",
        px: 1.5,
        fontSize: "12px",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Link
          href={projectsUrl}
          style={{ textDecoration: "none" }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: "13px",
              color: "var(--fg-muted)",
              transition: "color 0.1s",
              "&:hover": { color: "var(--fg)" },
            }}
          >
            Projects
          </Typography>
        </Link>
        <Typography component="span" sx={{ color: "var(--line)", fontSize: "12px" }}>
          /
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "13px",
            lineHeight: 1,
          }}
        >
          <Typography component="span" sx={{ color: "var(--fg-muted)", fontFamily: "inherit", fontSize: "inherit" }}>
            {repository.owner}/
          </Typography>
          <Typography component="span" sx={{ fontWeight: 600, color: "var(--fg)", fontFamily: "inherit", fontSize: "inherit" }}>
            {repository.name}
          </Typography>
        </Typography>
      </Box>

      <Typography
        component="span"
        title={commitSha}
        sx={{
          fontFamily: "var(--font-geist-mono), monospace",
          color: "var(--fg-muted)",
          fontSize: "12px",
        }}
      >
        {commitSha.slice(0, 7)}
      </Typography>

      <Box component="span" sx={{ ml: "auto", display: "inline-flex", alignItems: "center", gap: 1 }}>
        <SecurityActionCluster
          analysisId={analysisId}
          repository={repository}
          commitSha={commitSha}
        />
        <RerunButton analysisId={analysisId} onStarted={() => router.refresh()} />
      </Box>
    </Box>
  );
}
