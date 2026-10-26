import type { RawFinding, SecurityFinding } from "../types.ts";

export type StoredRoute = {
  id: string;
  file_id: string;
  path: string;
  method: string;
  filePath?: string;
};

export type StoredEdge = {
  source_file_id: string;
  target_file_id: string;
};

export type StoredFile = {
  id: string;
  path: string;
};

/**
 * Deterministically calculates whether security findings in files are reachable
 * from public HTTP route endpoints via the dependency graph.
 */
export function calculateReachability(
  findings: RawFinding[],
  files: StoredFile[],
  edges: StoredEdge[],
  routes: StoredRoute[],
): SecurityFinding[] {
  const fileIdByPath = new Map<string, string>();
  const pathByFileId = new Map<string, string>();
  for (const f of files) {
    fileIdByPath.set(f.path, f.id);
    pathByFileId.set(f.id, f.path);
  }

  // Build adjacency list: source -> targets
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    const list = adjacency.get(e.source_file_id) ?? [];
    list.push(e.target_file_id);
    adjacency.set(e.source_file_id, list);
  }

  // Pre-calculate shortest reachability path from any route file to all other files
  // Map: targetFileId -> shortest path of fileIds [routeFileId, ..., targetFileId]
  const shortestPathFromRoutes = new Map<string, string[]>();

  for (const r of routes) {
    const startId = r.file_id;
    if (!startId) continue;

    // BFS from this route entrypoint
    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!shortestPathFromRoutes.has(current.id)) {
        shortestPathFromRoutes.set(current.id, current.path);
      }

      const neighbors = adjacency.get(current.id) ?? [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push({ id: n, path: [...current.path, n] });
        }
      }
    }
  }

  return findings.map((finding) => {
    const targetFileId = fileIdByPath.get(finding.filePath);
    if (!targetFileId) {
      return { ...finding, isReachable: false, reachabilityChain: [] };
    }

    const pathIds = shortestPathFromRoutes.get(targetFileId);
    if (pathIds && pathIds.length > 0) {
      const reachabilityChain = pathIds.map((id) => pathByFileId.get(id) ?? id);
      return {
        ...finding,
        isReachable: true,
        reachabilityChain,
        // Escalate severity if reachable from a public HTTP endpoint
        severity:
          finding.severity === "high" && finding.category === "ast_sink"
            ? "critical"
            : finding.severity,
      };
    }

    return {
      ...finding,
      isReachable: false,
      reachabilityChain: [],
    };
  });
}
