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

export type SubmissionStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | {
      state: "created";
      issueNumber: number;
      issueUrl: string;
      prBranch: string;
      simulated?: boolean;
    }
  | { state: "error"; message: string };
