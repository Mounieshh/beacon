import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

type Metadata = {
  version: number;
  beaconAnalysisId?: string;
  repository?: string;
  commitSha?: string;
  activeFile?: string;
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

async function main() {
  const issueBody = process.env.ISSUE_BODY || "";
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (!issueBody.trim()) {
    console.error("Error: ISSUE_BODY environment variable is empty.");
    process.exit(1);
  }

  if (!apiKey) {
    console.error("Error: No GEMINI_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY provided.");
    process.exit(1);
  }

  const { metadata, prompt } = extractMetadata(issueBody);
  const targetFile = metadata?.activeFile;

  let fileContent = "";
  if (targetFile && fs.existsSync(targetFile)) {
    fileContent = fs.readFileSync(targetFile, "utf-8");
  }

  const baseURL = process.env.GEMINI_API_KEY
    ? "https://generativelanguage.googleapis.com/v1beta/openai/"
    : process.env.OPENROUTER_API_KEY
      ? "https://openrouter.ai/api/v1"
      : undefined;

  const model = process.env.GEMINI_API_KEY
    ? "gemini-3.8-flash"
    : process.env.OPENROUTER_API_KEY
      ? "google/gemini-3.8-flash"
      : "gpt-4o-mini";

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  console.log(`[Beacon AI Fixer] Processing issue... Target file: ${targetFile ?? "auto-detect"}`);

  const systemPrompt = `You are Beacon's autonomous code repair agent.
You are given an issue reported by a developer and repository context.
Your goal is to provide a complete, robust fix.
Respond with ONLY a JSON object in this format:
{
  "file": "<relative file path to edit or create>",
  "content": "<complete new file content>",
  "summary": "<1-sentence summary of the fix>"
}`;

  const userMessage = [
    `Issue Report:\n${prompt}`,
    targetFile ? `Target File: ${targetFile}` : "",
    fileContent ? `Existing File Content:\n\`\`\`\n${fileContent}\n\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const reply = response.choices[0]?.message?.content;
  if (!reply) {
    console.error("Error: Model returned empty response.");
    process.exit(1);
  }

  const result = JSON.parse(reply) as {
    file: string;
    content: string;
    summary: string;
  };

  if (!result.file || !result.content) {
    console.error("Error: Invalid JSON payload from model:", reply);
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), result.file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, result.content, "utf-8");

  console.log(`[Beacon AI Fixer] Applied fix to: ${result.file}`);
  console.log(`[Beacon AI Fixer] Summary: ${result.summary}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
