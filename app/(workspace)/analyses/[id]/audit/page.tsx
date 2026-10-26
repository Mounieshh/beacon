import { Box } from "@mui/material";
import { notFound } from "next/navigation";
import { AnalysisHeader } from "@/components/analysis-header";
import { SecurityDashboardView } from "@/components/security/security-dashboard-view";
import { getExistingSecurityAudit } from "@/lib/security/service";
import { createServerSupabase } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SecurityAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createServerSupabase();
  const { data: analysis, error } = await supabase
    .from("analyses")
    .select("id, status, commit_sha, project:projects(repo_owner, repo_name)")
    .eq("id", id)
    .maybeSingle();

  if (error || !analysis || !analysis.project || !analysis.commit_sha) {
    notFound();
  }

  const { audit, findings } = await getExistingSecurityAudit(id);

  const header = {
    analysisId: analysis.id,
    repository: {
      owner: analysis.project.repo_owner,
      name: analysis.project.repo_name,
    },
    commitSha: analysis.commit_sha,
  };

  return (
    <Box className="flex h-full flex-col">
      <AnalysisHeader {...header} />
      <SecurityDashboardView
        analysisId={id}
        repository={header.repository}
        commitSha={header.commitSha}
        audit={audit}
        findings={findings}
      />
    </Box>
  );
}
