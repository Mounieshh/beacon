"use server";

import { auth } from "@clerk/nextjs/server";
import type {
  BeaconIssueMetadata,
  IssueSubmissionRequest,
  PullRequestCheckResult,
  SubmissionResult,
  WorkflowRunInfo,
} from "@/lib/issue-agent/types";

const BEACON_OWNER = process.env.BEACON_REPO_OWNER || "Mounieshh";
const BEACON_REPO = process.env.BEACON_REPO_NAME || "beacon";

export async function createRepositoryIssueAction(
  request: IssueSubmissionRequest,
): Promise<SubmissionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { ok: false, error: "You must be signed in to report development errors" };
    }

    const prompt = request.prompt?.trim();
    if (!prompt || prompt.length < 3) {
      return { ok: false, error: "Please enter an issue description of at least 3 characters" };
    }

    const titleSummary =
      prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt;
    const issueTitle = `[Beacon Fix] ${titleSummary}`;

    const metadata: BeaconIssueMetadata = {
      version: 1,
      hostRepository: `${BEACON_OWNER}/${BEACON_REPO}`,
      activeFile: request.activeFile,
      analysisId: request.analysisId,
      contextPage: request.contextPage,
      createdFrom: "beacon-agent-dock",
    };

    const issueBody = [
      "## 🐛 Beacon Development Issue",
      prompt,
      "",
      "### 📍 Beacon App Context",
      `- **Target Codebase:** \`${BEACON_OWNER}/${BEACON_REPO}\``,
      request.activeFile ? `- **Target File:** \`${request.activeFile}\`` : null,
      request.contextPage ? `- **Page Location:** \`${request.contextPage}\`` : null,
      request.analysisId ? `- **Active Analysis ID:** \`${request.analysisId}\`` : null,
      request.errorStack ? `\n\`\`\`\n${request.errorStack}\n\`\`\`` : null,
      "",
      "> 🤖 *This development error was reported from Beacon. The CI fixer workflow will inspect this repository (`beacon`), verify the fix with `tsc --noEmit`, and open a Draft Pull Request.*",
      "",
      "<!-- BEACON_METADATA_START",
      JSON.stringify(metadata, null, 2),
      "BEACON_METADATA_END -->",
    ]
      .filter((line) => line !== null)
      .join("\n");

    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN;

    if (!githubToken) {
      return {
        ok: true,
        issueNumber: 42,
        issueUrl: `https://github.com/${BEACON_OWNER}/${BEACON_REPO}/issues/42`,
        prBranch: "beacon/fix-issue-42",
        simulated: true,
      };
    }

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(BEACON_OWNER)}/${encodeURIComponent(BEACON_REPO)}/issues`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "User-Agent": "beacon-issue-agent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: ["beacon-ai-fix"],
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        error: `GitHub API error (${response.status}): ${errText}`,
      };
    }

    const data = (await response.json()) as {
      number: number;
      html_url: string;
    };

    return {
      ok: true,
      issueNumber: data.number,
      issueUrl: data.html_url,
      prBranch: `beacon/fix-issue-${data.number}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error creating issue";
    return { ok: false, error: message };
  }
}

export async function findTriggeredWorkflowRunAction(
  issueNumber: number,
  titleSnippet?: string,
): Promise<{ found: true; run: WorkflowRunInfo } | { found: false }> {
  try {
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN;

    if (!githubToken) {
      return {
        found: true,
        run: {
          id: 999000 + issueNumber,
          html_url: `https://github.com/${BEACON_OWNER}/${BEACON_REPO}/actions/runs/999000`,
          status: "in_progress",
          display_title: `Simulated Fix for Issue #${issueNumber}`,
        },
      };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(BEACON_OWNER)}/${encodeURIComponent(BEACON_REPO)}/actions/runs?event=issues&per_page=10`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "beacon-issue-agent",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { found: false };
    }

    const data = (await response.json()) as {
      workflow_runs?: Array<{
        id: number;
        html_url: string;
        status: "queued" | "in_progress" | "completed";
        conclusion: string | null;
        display_title: string;
        created_at: string;
      }>;
    };

    const runs = data.workflow_runs || [];
    const matched = runs.find((r) => {
      if (r.status !== "queued" && r.status !== "in_progress") return false;
      if (titleSnippet && r.display_title.toLowerCase().includes(titleSnippet.toLowerCase().slice(0, 20))) {
        return true;
      }
      return true;
    });

    if (matched) {
      return {
        found: true,
        run: {
          id: matched.id,
          html_url: matched.html_url,
          status: matched.status,
          conclusion: matched.conclusion,
          display_title: matched.display_title,
        },
      };
    }

    return { found: false };
  } catch {
    return { found: false };
  }
}

export async function cancelWorkflowRunAction(
  runId: number,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN;

    if (!githubToken) {
      return { ok: true, message: "Simulated workflow run cancelled" };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(BEACON_OWNER)}/${encodeURIComponent(BEACON_REPO)}/actions/runs/${runId}/cancel`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "beacon-issue-agent",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, message: `Failed to cancel run (${response.status}): ${text}` };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error cancelling workflow run";
    return { ok: false, message: msg };
  }
}

export async function checkPullRequestStatusAction(
  issueNumber: number,
): Promise<PullRequestCheckResult> {
  try {
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN;

    if (!githubToken) {
      return {
        found: true,
        prNumber: issueNumber + 1,
        prUrl: `https://github.com/${BEACON_OWNER}/${BEACON_REPO}/pull/${issueNumber + 1}`,
        prTitle: `🤖 Fix: Automated resolution for issue #${issueNumber}`,
        state: "open",
        isDraft: true,
        mergeable: true,
        commitsCount: 1,
      };
    }

    const headBranch = `beacon/fix-issue-${issueNumber}`;
    const url = `https://api.github.com/repos/${encodeURIComponent(BEACON_OWNER)}/${encodeURIComponent(BEACON_REPO)}/pulls?head=${encodeURIComponent(BEACON_OWNER)}:${encodeURIComponent(headBranch)}&state=all`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "beacon-issue-agent",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { found: false, workflowStatus: "in_progress" };
    }

    const prs = (await response.json()) as Array<{
      number: number;
      html_url: string;
      title: string;
      state: "open" | "closed";
      draft?: boolean;
      mergeable?: boolean | null;
      commits?: number;
    }>;

    if (prs && Array.isArray(prs) && prs.length > 0) {
      const pr = prs[0];
      return {
        found: true,
        prNumber: pr.number,
        prUrl: pr.html_url,
        prTitle: pr.title,
        state: pr.state,
        isDraft: Boolean(pr.draft),
        mergeable: pr.mergeable ?? true,
        commitsCount: pr.commits ?? 1,
      };
    }

    return { found: false, workflowStatus: "in_progress" };
  } catch {
    return { found: false, workflowStatus: "unknown" };
  }
}
