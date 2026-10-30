export type IssueSubmissionRequest = {
  prompt: string;
  activeFile?: string;
  analysisId?: string;
  contextPage?: string;
  errorStack?: string;
};

export type BeaconIssueMetadata = {
  version: 1;
  hostRepository: string;
  activeFile?: string;
  analysisId?: string;
  contextPage?: string;
  createdFrom: "beacon-agent-dock";
};

export type SubmissionResult =
  | {
      ok: true;
      issueNumber: number;
      issueUrl: string;
      prBranch: string;
      simulated?: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type PullRequestCheckResult =
  | {
      found: true;
      prNumber: number;
      prUrl: string;
      prTitle: string;
      state: "open" | "closed";
      isDraft: boolean;
      mergeable: boolean | null;
      commitsCount: number;
    }
  | {
      found: false;
      workflowStatus?: "queued" | "in_progress" | "completed" | "unknown";
      activeStep?: string;
    };

export type AgentStepPhase =
  | "dispatching"
  | "grounding"
  | "cogitating"
  | "editing"
  | "typechecking"
  | "pr_ready"
  | "error";

export type AgentLogMessage = {
  id: string;
  timestamp: string;
  sender: "user" | "agent" | "system";
  content: string;
  phase?: AgentStepPhase;
  metadata?: {
    issueNumber?: number;
    issueUrl?: string;
    prUrl?: string;
    prBranch?: string;
    commitsCount?: number;
  };
};

export type SubmissionStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | {
      state: "running";
      issueNumber: number;
      issueUrl: string;
      prBranch: string;
      simulated?: boolean;
    }
  | {
      state: "created";
      issueNumber: number;
      issueUrl: string;
      prBranch: string;
      simulated?: boolean;
    }
  | { state: "error"; message: string };
