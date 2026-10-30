import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI, Type } from "@google/genai";

type Metadata = {
  version: number;
  hostRepository?: string;
  commitSha?: string;
  activeFile?: string;
  contextPage?: string;
  findingTitle?: string;
};

function extractMetadata(issueBody: string): { metadata: Metadata | null; prompt: string } {
  const startMarker = "<!-- BEACON_METADATA_START";
  const endMarker = "BEACON_METADATA_END -->";

  const startIndex = issueBody.indexOf(startMarker);
  const endIndex = issueBody.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    return { metadata: null, prompt: issueBody };
  }

  const rawJson = issueBody.slice(startIndex + startMarker.length, endIndex).trim();
  const cleanPrompt = issueBody.slice(0, startIndex).trim();

  try {
    const metadata = JSON.parse(rawJson) as Metadata;
    return { metadata, prompt: cleanPrompt };
  } catch {
    return { metadata: null, prompt: issueBody };
  }
}

function autoDetectTargetFile(prompt: string): string | undefined {
  const words = prompt.match(/[A-Za-z0-9_.-]{4,}/g) || [];
  const searchDirs = ["components", "app", "lib"];

  for (const word of words) {
    if (
      [
        "issue",
        "problem",
        "error",
        "console",
        "hydration",
        "please",
        "there",
        "which",
        "warning",
        "failed",
        "cannot",
        "target",
        "codebase",
      ].includes(word.toLowerCase())
    ) {
      continue;
    }

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const relFile of files) {
        if (!/\.(tsx?|jsx?|css)$/.test(relFile)) continue;
        const fullPath = path.join(dir, relFile);
        try {
          if (!fs.statSync(fullPath).isFile()) continue;
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.includes(word)) {
            return fullPath.replace(/\\/g, "/");
          }
        } catch {
          // continue
        }
      }
    }
  }
  return undefined;
}

async function main() {
  const issueBody = process.env.ISSUE_BODY || "";
  const apiKey = process.env.GEMINI_API_KEY;

  if (!issueBody.trim()) {
    console.error("Error: ISSUE_BODY environment variable is empty.");
    process.exit(1);
  }

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const { metadata, prompt } = extractMetadata(issueBody);
  let targetFile = metadata?.activeFile;

  if (!targetFile) {
    targetFile = autoDetectTargetFile(prompt);
  }

  let fileContent = "";
  if (targetFile && fs.existsSync(targetFile)) {
    fileContent = fs.readFileSync(targetFile, "utf-8");
  }

  console.log(`[Beacon AI Fixer] Processing issue... Target file: ${targetFile ?? "unspecified"}`);

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are Beacon's autonomous code repair agent.
You are given an issue reported by a developer and repository context.
Your goal is to provide a complete, robust fix.
Respond with a JSON object containing the relative file path to edit or create, the complete new file content, and a 1-sentence summary of the fix.`;

  const userMessage = [
    `Issue Report:\n${prompt}`,
    targetFile ? `Target File: ${targetFile}` : "",
    fileContent ? `Existing File Content:\n\`\`\`\n${fileContent}\n\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  console.log("[Beacon AI Fixer] Calling Google Gen AI SDK (gemini-3.8-flash)...");

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          file: {
            type: Type.STRING,
            description: "Relative file path to edit or create",
          },
          content: {
            type: Type.STRING,
            description: "Complete new file content",
          },
          summary: {
            type: Type.STRING,
            description: "1-sentence summary of the fix",
          },
        },
        required: ["file", "content", "summary"],
      },
      abortSignal: AbortSignal.timeout(180_000),
    },
  });

  const rawJson = response.text;
  if (!rawJson) {
    console.error("Error: Model returned empty response.");
    process.exit(1);
  }

  const result = JSON.parse(rawJson) as {
    file: string;
    content: string;
    summary: string;
  };

  if (!result.file || !result.content) {
    console.error("Error: Invalid JSON payload from model:", rawJson);
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), result.file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, result.content, "utf-8");

  console.log(`[Beacon AI Fixer] Successfully applied fix to: ${result.file}`);
  console.log(`[Beacon AI Fixer] Summary: ${result.summary}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
