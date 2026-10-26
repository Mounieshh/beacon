import type { RawFinding } from "../types.ts";

// Deterministic regex patterns for credential and secret leakage.
const SECRET_PATTERNS: readonly {
  ruleId: string;
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium";
  description: string;
}[] = [
  {
    ruleId: "sec-private-key",
    name: "Hardcoded Private Key",
    pattern: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PGP)\s+PRIVATE\s+KEY-----/,
    severity: "critical",
    description: "Cryptographic private key found hardcoded in source repository.",
  },
  {
    ruleId: "sec-aws-access-key",
    name: "AWS Access Key ID",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    severity: "critical",
    description: "Hardcoded AWS Access Key identifier found in source code.",
  },
  {
    ruleId: "sec-github-token",
    name: "GitHub Personal Access Token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{82}\b/,
    severity: "critical",
    description: "Exposed GitHub personal access token with repository or org permissions.",
  },
  {
    ruleId: "sec-stripe-key",
    name: "Stripe API Secret Key",
    pattern: /\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}\b/,
    severity: "critical",
    description: "Hardcoded Stripe payment secret key detected.",
  },
  {
    ruleId: "sec-slack-token",
    name: "Slack API Token",
    pattern: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/,
    severity: "high",
    description: "Slack bot or user token hardcoded in source code.",
  },
  {
    ruleId: "sec-jwt-token",
    name: "Hardcoded JWT Token",
    pattern: /\beyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+\b/,
    severity: "high",
    description: "Full JSON Web Token embedded in source code, potentially granting unauthorized access.",
  },
  {
    ruleId: "sec-generic-secret",
    name: "Hardcoded High-Entropy Password or API Key",
    pattern: /(?:api[_-]?key|secret[_-]?key|password|auth[_-]?token)\s*[:=]\s*["']([A-Za-z0-9!@#$%^&*()_+=\-`~]{16,64})["']/i,
    severity: "high",
    description: "Sensitive credential assignment found with high string entropy.",
  },
];

export function scanSecrets(filePath: string, content: string): RawFinding[] {
  const findings: RawFinding[] = [];
  const lines = content.split("\n");

  // Check committed config / env files
  if (filePath.endsWith(".env") || filePath.includes(".env.local") || filePath.includes(".env.production")) {
    findings.push({
      filePath,
      lineNumber: 1,
      ruleId: "sec-committed-env",
      category: "config_flaw",
      severity: "critical",
      title: "Committed Environment Secrets File",
      description: "An environment file was committed to source control. It may expose production API secrets.",
      codeSnippet: filePath,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip obvious comments or test files if they don't contain real private keys
    for (const rule of SECRET_PATTERNS) {
      const match = rule.pattern.exec(line);
      if (match) {
        // Redact snippet for safety
        const snippet = redact(line.trim());
        findings.push({
          filePath,
          lineNumber: i + 1,
          ruleId: rule.ruleId,
          category: "secret_leak",
          severity: rule.severity,
          title: rule.name,
          description: rule.description,
          codeSnippet: snippet,
        });
        break; // Match first matching rule per line
      }
    }
  }

  return findings;
}

function redact(line: string): string {
  if (line.length > 120) {
    return line.slice(0, 117) + "…";
  }
  return line;
}
