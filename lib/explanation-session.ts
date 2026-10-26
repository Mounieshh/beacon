/**
 * Client persistence and quota management for AI explanations and solutions.
 * Scoped by analysisId to ensure project isolation across browser tabs and reloads.
 */

export const MAX_GENERATION_LIMIT = 2;

export interface StoredExplanationEntry {
  result: any;
  count: number;
}

export interface StoredSolutionEntry {
  body: string;
  model: string;
  cached: boolean;
  count: number;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage) return window.localStorage;
    if (window.sessionStorage) return window.sessionStorage;
  } catch {
    // In restricted sandbox / private modes
  }
  return null;
}

export function getAnalysisStorageKey(analysisId: string): string {
  return `beacon:v1:explanations:${analysisId}`;
}

export function getFindingStorageKey(analysisId: string): string {
  return `beacon:v1:solutions:${analysisId}`;
}

export function loadStoredExplanations(analysisId: string): Map<string, StoredExplanationEntry> {
  const storage = getStorage();
  if (!storage) return new Map();
  try {
    const raw = storage.getItem(getAnalysisStorageKey(analysisId));
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export function saveStoredExplanation(
  analysisId: string,
  targetKey: string,
  result: any,
  currentCount: number
): number {
  const storage = getStorage();
  const newCount = currentCount + 1;
  if (!storage) return newCount;
  try {
    const existing = loadStoredExplanations(analysisId);
    existing.set(targetKey, { result, count: newCount });
    const obj = Object.fromEntries(existing.entries());
    storage.setItem(getAnalysisStorageKey(analysisId), JSON.stringify(obj));
    return newCount;
  } catch {
    return newCount;
  }
}

export function loadStoredSolutions(analysisId: string): Map<string, StoredSolutionEntry> {
  const storage = getStorage();
  if (!storage) return new Map();
  try {
    const raw = storage.getItem(getFindingStorageKey(analysisId));
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export function saveStoredSolution(
  analysisId: string,
  finding: { id?: string; ruleId: string; filePath: string; lineNumber?: number | null },
  solution: { body: string; model: string; cached: boolean },
  currentCount: number
): number {
  const storage = getStorage();
  const newCount = currentCount + 1;
  if (!storage) return newCount;
  try {
    const existing = loadStoredSolutions(analysisId);
    const entry: StoredSolutionEntry = { ...solution, count: newCount };

    // Save under both id (if present) and compound key for resilient retrieval
    if (finding.id) {
      existing.set(finding.id, entry);
    }
    const compoundKey = `${finding.ruleId}:${finding.filePath}:${finding.lineNumber ?? 0}`;
    existing.set(compoundKey, entry);

    const obj = Object.fromEntries(existing.entries());
    storage.setItem(getFindingStorageKey(analysisId), JSON.stringify(obj));
    return newCount;
  } catch {
    return newCount;
  }
}

export function getStoredSolutionForFinding(
  analysisId: string,
  finding: { id?: string; ruleId: string; filePath: string; lineNumber?: number | null }
): StoredSolutionEntry | null {
  const solutions = loadStoredSolutions(analysisId);
  if (finding.id && solutions.has(finding.id)) {
    return solutions.get(finding.id)!;
  }
  const compoundKey = `${finding.ruleId}:${finding.filePath}:${finding.lineNumber ?? 0}`;
  return solutions.get(compoundKey) ?? null;
}
