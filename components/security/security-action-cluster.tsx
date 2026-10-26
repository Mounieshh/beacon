"use client";

import { useEffect, useState, useTransition } from "react";
import { Box, Button } from "@mui/material";
import { getSecurityAuditAction, runSecurityAuditAction } from "@/app/(workspace)/analyses/[id]/actions";
import type { SecurityFinding, StoredAudit } from "@/lib/security/types";
import { SecurityAuditDialog } from "./security-audit-dialog";

export function SecurityActionCluster({
  analysisId,
  repository,
  commitSha,
}: {
  analysisId: string;
  repository: { owner: string; name: string };
  commitSha: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [audit, setAudit] = useState<StoredAudit | null>(null);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAudit, setHasAudit] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Check if an audit exists on mount
  useEffect(() => {
    let cancelled = false;
    getSecurityAuditAction(analysisId).then((res) => {
      if (!cancelled && res.ok && res.audit && res.audit.status === "complete") {
        setAudit(res.audit);
        setFindings(res.findings);
        setHasAudit(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const handleStartAudit = (forceRerun = false) => {
    setDialogOpen(true);
    setLoading(true);
    setError(null);

    startTransition(async () => {
      const result = await runSecurityAuditAction(analysisId, forceRerun);
      setLoading(false);
      if (result.ok) {
        setAudit(result.audit);
        setFindings(result.findings);
        setHasAudit(true);
      } else {
        setError(result.error);
      }
    });
  };

  const handleOpenShowAudit = () => {
    setDialogOpen(true);
  };

  return (
    <>
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
        <Button
          type="button"
          disabled={loading || isPending}
          size="small"
          onClick={() => handleStartAudit(hasAudit)}
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
          {loading ? "Auditing…" : "Security Audit"}
        </Button>

        {hasAudit && (
          <Button
            type="button"
            size="small"
            onClick={handleOpenShowAudit}
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
            }}
          >
            Show Audit
          </Button>
        )}
      </Box>

      <SecurityAuditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        analysisId={analysisId}
        repository={repository}
        commitSha={commitSha}
        audit={audit}
        findings={findings}
        loading={loading || isPending}
        error={error}
        onRerun={() => handleStartAudit(true)}
      />
    </>
  );
}
