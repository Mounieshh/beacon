import fs from "node:fs";
import path from "node:path";

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

async function callGeminiNative(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini returned empty candidate response.");
  }
  return rawText;
}

async function callOpenAICompatible(
  baseURL: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const endpoint = `${baseURL.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string };
    }>;
  };

  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error("Model returned empty response.");
  }
  return rawText;
}

async function main() {
  const issueBody = process.env.ISSUE_BODY || "";
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!issueBody.trim()) {
    console.error("Error: ISSUE_BODY environment variable is empty.");
    process.exit(1);
  }

  if (!geminiKey && !openRouterKey && !openAIKey) {
    console.error("Error: No GEMINI_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY provided.");
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

  let rawJson = "";

  if (geminiKey) {
    console.log("[Beacon AI Fixer] Calling Gemini API (gemini-2.5-flash)...");
    rawJson = await callGeminiNative(geminiKey, systemPrompt, userMessage);
  } else if (openRouterKey) {
    console.log("[Beacon AI Fixer] Calling OpenRouter API...");
    rawJson = await callOpenAICompatible(
      "https://openrouter.ai/api/v1",
      openRouterKey,
      "google/gemini-2.5-flash",
      systemPrompt,
      userMessage,
    );
  } else if (openAIKey) {
    console.log("[Beacon AI Fixer] Calling OpenAI API...");
    rawJson = await callOpenAICompatible(
      "https://api.openai.com/v1",
      openAIKey,
      "gpt-4o-mini",
      systemPrompt,
      userMessage,
    );
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
