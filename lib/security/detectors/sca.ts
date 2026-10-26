import type { RawFinding } from "../types.ts";

type Advisory = {
  pkg: string;
  maxVulnerableVersion: string; // e.g. "4.17.20"
  cve: string;
  severity: "critical" | "high" | "medium";
  title: string;
  description: string;
};

// Deterministic list of known high-impact CVEs for popular NPM packages
const ADVISORIES: readonly Advisory[] = [
  {
    pkg: "lodash",
    maxVulnerableVersion: "4.17.20",
    cve: "CVE-2021-23337",
    severity: "high",
    title: "Prototype Pollution in lodash",
    description: "Command injection / prototype pollution via template function.",
  },
  {
    pkg: "jsonwebtoken",
    maxVulnerableVersion: "8.5.1",
    cve: "CVE-2022-23529",
    severity: "critical",
    title: "Remote Code Execution in jsonwebtoken",
    description: "Insecure secretOrPublicKey parameter verification allows RCE via arbitrary method calls.",
  },
  {
    pkg: "axios",
    maxVulnerableVersion: "0.21.1",
    cve: "CVE-2020-28168",
    severity: "high",
    title: "Server-Side Request Forgery in axios",
    description: "Insecure following of redirects with HTTP proxy headers.",
  },
  {
    pkg: "minimist",
    maxVulnerableVersion: "1.2.5",
    cve: "CVE-2021-44906",
    severity: "critical",
    title: "Prototype Pollution in minimist",
    description: "Parsing user input with __proto__ or constructor keys corrupts global Object prototype.",
  },
  {
    pkg: "semver",
    maxVulnerableVersion: "7.5.1",
    cve: "CVE-2022-25883",
    severity: "medium",
    title: "Regular Expression Denial of Service in semver",
    description: "ReDoS vulnerability when parsing complex untrusted semver strings.",
  },
  {
    pkg: "tar",
    maxVulnerableVersion: "6.1.8",
    cve: "CVE-2021-37712",
    severity: "high",
    title: "Arbitrary File Overwrite in node-tar",
    description: "Symlink traversal leading to arbitrary file write outside destination directory.",
  },
];

export function scanDependencies(filePath: string, content: string): RawFinding[] {
  const findings: RawFinding[] = [];
  if (!filePath.endsWith("package.json")) return findings;

  try {
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    for (const adv of ADVISORIES) {
      const versionSpec = allDeps[adv.pkg];
      if (versionSpec) {
        // Simple deterministic version comparison
        const clean = versionSpec.replace(/^[~^>=< ]+/, "");
        if (isLowerOrEqual(clean, adv.maxVulnerableVersion)) {
          findings.push({
            filePath,
            lineNumber: null,
            ruleId: `sca-${adv.cve.toLowerCase()}`,
            category: "sca_vulnerability",
            severity: adv.severity,
            title: `${adv.title} (${adv.cve})`,
            description: `${adv.pkg}@${versionSpec} is vulnerable to ${adv.cve}. ${adv.description}`,
            codeSnippet: `"${adv.pkg}": "${versionSpec}"`,
          });
        }
      }
    }
  } catch {
    // Malformed package.json
  }

  return findings;
}

function isLowerOrEqual(v1: string, v2: string): boolean {
  const p1 = v1.split(".").map(Number);
  const p2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 < num2) return true;
    if (num1 > num2) return false;
  }
  return true;
}
