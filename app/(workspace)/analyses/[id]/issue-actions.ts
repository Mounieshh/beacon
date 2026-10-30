"use server";

import { auth } from "@clerk/nextjs/server";
import type {
  BeaconIssueMetadata,
  IssueSubmissionRequest,
  SubmissionResult,
} from "@/lib/issue-agent/types";

export async function createRepositoryIssueAction(
  request: IssueSubmissionRequest,
): Promise<SubmissionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { ok: false, error: "You must be signed in to report issues" };
    }

    const prompt = request.prompt?.trim();
    if (!prompt || prompt.length < 3) {
      return { ok: false, error: "Please enter an issue description of at least 3 characters" };
    }

    const { owner, name } = request.repository;
    if (!owner || !name) {
      return { ok: false, error: "Repository owner or name missing" };
    }

    const titleSummary =
      prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt;
    const issueTitle = `[Beacon AI Fix] ${titleSummary}`;

    const metadata: BeaconIssueMetadata = {
      version: 1,
      beaconAnalysisId: request.analysisId,
      repository: `${owner}/${name}`,
      commitSha: request.commitSha,
      activeFile: request.activeFile,
      findingTitle: request.findingTitle,
      createdFrom: "beacon-agent-dock",
    };

    const issueBody = [
      "## 🎯 Reported Issue",
      prompt,
      "",
      "### 📍 Beacon Context",
      `- **Repository:** \`${owner}/${name}\``,
      `- **Analysis ID:** \`${request.analysisId}\``,
      `- **Commit SHA:** \`${request.commitSha}\``,
      request.activeFile ? `- **Target File:** \`${request.activeFile}\`` : null,
      request.findingTitle ? `- **Finding Reference:** ${request.findingTitle}` : null,
      "",
      "> 🤖 *This issue was reported from Beacon. The CI workflow is triggered to inspect the codebase and prepare a verified draft pull request.*",
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
        issueUrl: `https://github.com/${owner}/${name}/issues/42`,
        prBranch: "beacon/fix-issue-42",
        simulated: true,
      };
    }

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues`,
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
