import type { RawFinding } from "../types.ts";

const SINK_PATTERNS: readonly {
  ruleId: string;
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium";
  description: string;
}[] = [
  {
    ruleId: "sink-eval",
    name: "Dangerous Code Execution via eval()",
    pattern: /\beval\s*\(/,
    severity: "critical",
    description: "Calling eval() compiles and executes arbitrary code, enabling remote code execution (RCE).",
  },
  {
    ruleId: "sink-new-function",
    name: "Dynamic Function Constructor",
    pattern: /new\s+Function\s*\(/,
    severity: "high",
    description: "Creating functions from dynamic strings bypasses lexical scope and allows arbitrary execution.",
  },
  {
    ruleId: "sink-command-exec",
    name: "Shell Command Execution",
    pattern: /\b(?:exec|execSync|spawn|spawnSync)\s*\(\s*(?:`|["'][^"']*?\$\{)/,
    severity: "critical",
    description: "Shell command executed with interpolated variables; vulnerable to command injection.",
  },
  {
    ruleId: "sink-xss-react",
    name: "React dangerouslySetInnerHTML Usage",
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/,
    severity: "high",
    description: "Bypasses React DOM sanitization, introducing potential Cross-Site Scripting (XSS).",
  },
  {
    ruleId: "sink-xss-dom",
    name: "Direct DOM innerHTML Assignment",
    pattern: /\.(?:innerHTML|outerHTML)\s*=\s*(?!["'`]<)/,
    severity: "high",
    description: "Assigning unescaped dynamic content to innerHTML enables client-side script injection.",
  },
  {
    ruleId: "sink-sql-injection",
    name: "Raw SQL String Interpolation",
    pattern: /(?:\.(?:query|execute|raw)\s*\(\s*)?`\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b[^`]*?\$\{/i,
    severity: "critical",
    description: "Database query constructed using string interpolation instead of parameterized queries.",
  },
  {
    ruleId: "sink-prototype-pollution",
    name: "Direct Prototype Assignment",
    pattern: /\[(?:'|")__proto__(?:'|")\]|\.__proto__\s*=/,
    severity: "high",
    description: "Direct mutation of __proto__ creates prototype pollution vulnerabilities.",
  },
  {
    ruleId: "sink-insecure-tls",
    name: "Disabled TLS Certificate Verification",
    pattern: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]/,
    severity: "high",
    description: "Disabling TLS validation exposes network requests to Man-in-the-Middle (MitM) attacks.",
  },
  {
    ruleId: "sink-unsafe-cors",
    name: "Overly Permissive CORS Configuration",
    pattern: /['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]|cors\(\s*\{\s*origin\s*:\s*['"]\*['"]/,
    severity: "medium",
    description: "Wildcard CORS origin allows any external site to read authenticated API responses.",
  },
];

export function scanSinks(filePath: string, content: string): RawFinding[] {
  const findings: RawFinding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of SINK_PATTERNS) {
      if (rule.pattern.test(line)) {
        findings.push({
          filePath,
          lineNumber: i + 1,
          ruleId: rule.ruleId,
          category: "ast_sink",
          severity: rule.severity,
          title: rule.name,
          description: rule.description,
          codeSnippet: line.trim().slice(0, 120),
        });
      }
    }
  }

  return findings;
}
