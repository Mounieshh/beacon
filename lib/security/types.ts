export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export type FindingCategory =
  | "ast_sink"
  | "secret_leak"
  | "sca_vulnerability"
  | "reachability_risk"
  | "config_flaw";

export type RawFinding = {
  filePath: string;
  lineNumber: number | null;
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  codeSnippet: string | null;
};

export type SecurityFinding = RawFinding & {
  id?: string;
  auditId?: string;
  analysisId?: string;
  organizationId?: string;
  isReachable: boolean;
  reachabilityChain: string[];
  createdAt?: string;
};

export type SecurityAuditSummary = {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  reachableSinksCount: number;
  secretsCount: number;
  scaCount: number;
};

export type StoredAudit = {
  id: string;
  analysisId: string;
  organizationId: string;
  status: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  summary: SecurityAuditSummary;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};
