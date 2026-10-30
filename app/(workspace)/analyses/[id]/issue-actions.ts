"use server";

import { auth } from "@clerk/nextjs/server";
import type {
  BeaconIssueMetadata,
  IssueSubmissionRequest,
  SubmissionResult,
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
      // Local dev simulation mode when no GitHub PAT/App token is configured
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
          labels: ["beacon-ai-fix", "automated"],
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
