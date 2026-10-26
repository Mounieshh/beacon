import { calculateReachability, type StoredEdge, type StoredFile, type StoredRoute } from "./detectors/reachability.ts";
import { scanDependencies } from "./detectors/sca.ts";
import { scanSecrets } from "./detectors/secrets.ts";
import { scanSinks } from "./detectors/sinks.ts";
import type { RawFinding, SecurityAuditSummary, SecurityFinding } from "./types.ts";

export type FileContentEntry = {
  path: string;
  content: string;
};

export function scanRepositoryFiles(
  entries: FileContentEntry[],
  graph?: {
    files: StoredFile[];
    edges: StoredEdge[];
    routes: StoredRoute[];
  },
): { findings: SecurityFinding[]; summary: SecurityAuditSummary } {
  const rawFindings: RawFinding[] = [];

  for (const entry of entries) {
    // 1. Secrets & leaked credentials
    const secrets = scanSecrets(entry.path, entry.content);
    rawFindings.push(...secrets);

    // 2. Dangerous code execution & AST sinks
    const sinks = scanSinks(entry.path, entry.content);
    rawFindings.push(...sinks);

    // 3. Vulnerable package dependencies
    const deps = scanDependencies(entry.path, entry.content);
    rawFindings.push(...deps);
  }

  // 4. Calculate route reachability if graph data is supplied
  let findings: SecurityFinding[];
  if (graph && graph.routes.length > 0 && graph.edges.length > 0) {
    findings = calculateReachability(rawFindings, graph.files, graph.edges, graph.routes);
  } else {
    findings = rawFindings.map((f) => ({ ...f, isReachable: false, reachabilityChain: [] }));
  }

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let infoCount = 0;
  let reachableSinksCount = 0;
  let secretsCount = 0;
  let scaCount = 0;

  for (const f of findings) {
    if (f.severity === "critical") criticalCount++;
    else if (f.severity === "high") highCount++;
    else if (f.severity === "medium") mediumCount++;
    else if (f.severity === "low") lowCount++;
    else infoCount++;

    if (f.isReachable) reachableSinksCount++;
    if (f.category === "secret_leak") secretsCount++;
    if (f.category === "sca_vulnerability") scaCount++;
  }

  const summary: SecurityAuditSummary = {
    totalFindings: findings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    infoCount,
    reachableSinksCount,
    secretsCount,
    scaCount,
  };

  return { findings, summary };
}
