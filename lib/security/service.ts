import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { selectFiles } from "../parser/index.ts";
import { downloadArchive, type Repository } from "../pipeline/github.ts";
import { createAdminSupabase } from "../supabase/admin.ts";
import { createServerSupabase } from "../supabase/server.ts";
import { scanRepositoryFiles, type FileContentEntry } from "./scanner.ts";
import type { SecurityAuditSummary, SecurityFinding, StoredAudit } from "./types.ts";
import type { Json } from "../supabase/database.types.ts";

export type { StoredAudit };

export async function getExistingSecurityAudit(analysisId: string): Promise<{
  audit: StoredAudit | null;
  findings: SecurityFinding[];
}> {
  const supabase = await createServerSupabase();
  const { data: audit, error: auditError } = await supabase
    .from("security_audits")
    .select("*")
    .eq("analysis_id", analysisId)
    .maybeSingle();

  if (auditError || !audit) {
    return { audit: null, findings: [] };
  }

  const { data: findings, error: findingsError } = await supabase
    .from("security_findings")
    .select("*")
    .eq("audit_id", audit.id)
    .order("severity", { ascending: true });

  if (findingsError || !findings) {
    return {
      audit: {
        id: audit.id,
        analysisId: audit.analysis_id,
        organizationId: audit.organization_id,
        status: audit.status,
        criticalCount: audit.critical_count,
        highCount: audit.high_count,
        mediumCount: audit.medium_count,
        lowCount: audit.low_count,
        infoCount: audit.info_count,
        summary: audit.summary as unknown as SecurityAuditSummary,
        error: audit.error,
        createdAt: audit.created_at,
        finishedAt: audit.finished_at,
      },
      findings: [],
    };
  }

  const formattedFindings: SecurityFinding[] = findings.map((f) => ({
    id: f.id,
    auditId: f.audit_id,
    analysisId: f.analysis_id,
    organizationId: f.organization_id,
    filePath: f.file_path,
    lineNumber: f.line_number,
    ruleId: f.rule_id,
    category: f.category as SecurityFinding["category"],
    severity: f.severity as SecurityFinding["severity"],
    title: f.title,
    description: f.description,
    codeSnippet: f.code_snippet,
    isReachable: f.is_reachable,
    reachabilityChain: (Array.isArray(f.reachability_chain) ? f.reachability_chain : []) as string[],
    createdAt: f.created_at,
  }));

  return {
    audit: {
      id: audit.id,
      analysisId: audit.analysis_id,
      organizationId: audit.organization_id,
      status: audit.status,
      criticalCount: audit.critical_count,
      highCount: audit.high_count,
      mediumCount: audit.medium_count,
      lowCount: audit.low_count,
      infoCount: audit.info_count,
      summary: audit.summary as unknown as SecurityAuditSummary,
      error: audit.error,
      createdAt: audit.created_at,
      finishedAt: audit.finished_at,
    },
    findings: formattedFindings,
  };
}

export async function runSecurityAuditForAnalysis(
  analysisId: string,
  options?: { forceRerun?: boolean },
): Promise<{ audit: StoredAudit; findings: SecurityFinding[] }> {
  // If not forcing re-run, check for cached completed audit first
  if (!options?.forceRerun) {
    const existing = await getExistingSecurityAudit(analysisId);
    if (existing.audit && existing.audit.status === "complete") {
      return { audit: existing.audit, findings: existing.findings };
    }
  }

  const userSupabase = await createServerSupabase();
  const { data: analysis, error: analysisError } = await userSupabase
    .from("analyses")
    .select("id, organization_id, commit_sha, status, project:projects(repo_owner, repo_name)")
    .eq("id", analysisId)
    .single();

  if (analysisError || !analysis) {
    throw new Error(`Analysis ${analysisId} not found`);
  }
  if (!analysis.commit_sha || !analysis.project) {
    throw new Error(`Analysis ${analysisId} is missing commit SHA or repository info`);
  }

  const admin = createAdminSupabase();
  const organizationId = analysis.organization_id;
  const repository: Repository = {
    owner: analysis.project.repo_owner,
    name: analysis.project.repo_name,
  };
  const sha = analysis.commit_sha;

  // Mark audit as running in security_audits table
  const { data: initialAudit, error: initError } = await admin
    .from("security_audits")
    .upsert(
      {
        analysis_id: analysisId,
        organization_id: organizationId,
        status: "running",
        error: null,
      },
      { onConflict: "analysis_id" },
    )
    .select()
    .single();

  if (initError || !initialAudit) {
    throw new Error(`Could not initialize security audit: ${initError?.message}`);
  }

  let workdir: string | null = null;
  try {
    workdir = await mkdtemp(path.join(tmpdir(), "beacon-audit-"));
    await downloadArchive(repository, sha, workdir);

    // Select all source files
    const selection = selectFiles(workdir);
    const fileEntries: FileContentEntry[] = selection.walk.candidates.map((c) => ({
      path: c.path,
      content: c.content,
    }));

    // Also look for manifests and config files that might have been skipped by code walker
    const rootFiles = await readdir(workdir).catch(() => []);
    for (const fileName of rootFiles) {
      if (fileName.endsWith(".json") || fileName.startsWith(".env") || fileName.endsWith(".lock") || fileName.endsWith(".yaml")) {
        const fullPath = path.join(workdir, fileName);
        try {
          const content = await readFile(fullPath, "utf8");
          if (!fileEntries.some((e) => e.path === fileName)) {
            fileEntries.push({ path: fileName, content });
          }
        } catch {
          // Skip unreadable files
        }
      }
    }

    // Load graph data for reachability
    const { data: dbFiles } = await admin
      .from("files")
      .select("id, path")
      .eq("analysis_id", analysisId);

    const { data: dbEdges } = await admin
      .from("edges")
      .select("source_file_id, target_file_id")
      .eq("analysis_id", analysisId);

    const { data: dbRoutes } = await admin
      .from("routes")
      .select("id, file_id, path, method")
      .eq("analysis_id", analysisId);

    const scanResult = scanRepositoryFiles(fileEntries, {
      files: dbFiles ?? [],
      edges: dbEdges ?? [],
      routes: dbRoutes ?? [],
    });

    const { summary, findings } = scanResult;

    // Delete existing findings for this audit if re-running
    await admin.from("security_findings").delete().eq("audit_id", initialAudit.id);

    // Store findings in batches
    if (findings.length > 0) {
      const records = findings.map((f) => ({
        audit_id: initialAudit.id,
        analysis_id: analysisId,
        organization_id: organizationId,
        file_path: f.filePath,
        line_number: f.lineNumber,
        rule_id: f.ruleId,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
        code_snippet: f.codeSnippet,
        is_reachable: f.isReachable,
        reachability_chain: f.reachabilityChain as unknown as Json,
      }));

      const { error: insertError } = await admin.from("security_findings").insert(records);
      if (insertError) {
        throw new Error(`Failed to store findings: ${insertError.message}`);
      }
    }

    // Mark audit complete
    const { data: completedAudit, error: updateError } = await admin
      .from("security_audits")
      .update({
        status: "complete",
        critical_count: summary.criticalCount,
        high_count: summary.highCount,
        medium_count: summary.mediumCount,
        low_count: summary.lowCount,
        info_count: summary.infoCount,
        summary: summary as unknown as Json,
        finished_at: new Date().toISOString(),
      })
      .eq("id", initialAudit.id)
      .select()
      .single();

    if (updateError || !completedAudit) {
      throw new Error(`Failed to update completed audit: ${updateError?.message}`);
    }

    const storedAudit: StoredAudit = {
      id: completedAudit.id,
      analysisId: completedAudit.analysis_id,
      organizationId: completedAudit.organization_id,
      status: completedAudit.status,
      criticalCount: completedAudit.critical_count,
      highCount: completedAudit.high_count,
      mediumCount: completedAudit.medium_count,
      lowCount: completedAudit.low_count,
      infoCount: completedAudit.info_count,
      summary,
      error: null,
      createdAt: completedAudit.created_at,
      finishedAt: completedAudit.finished_at,
    };

    return { audit: storedAudit, findings };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await admin
      .from("security_audits")
      .update({
        status: "failed",
        error: errorMsg,
        finished_at: new Date().toISOString(),
      })
      .eq("id", initialAudit.id);

    throw error;
  } finally {
    if (workdir) {
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
