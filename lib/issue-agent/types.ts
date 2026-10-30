export type IssueSubmissionRequest = {
  analysisId: string;
  repository: {
    owner: string;
    name: string;
  };
  commitSha: string;
  prompt: string;
  activeFile?: string;
  findingTitle?: string;
};

export type BeaconIssueMetadata = {
  version: 1;
  beaconAnalysisId: string;
  repository: string;
  commitSha: string;
  activeFile?: string;
  findingTitle?: string;
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
