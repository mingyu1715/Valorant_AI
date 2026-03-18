#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const DIRECT_SECRET_PATTERNS = [
  {
    regex: /RGAPI-[A-Za-z0-9-]{20,}/,
    label: "Riot API key 패턴이 감지되었습니다."
  },
  {
    regex: /AIza[0-9A-Za-z_-]{35}/,
    label: "Google API key 패턴이 감지되었습니다."
  },
  {
    regex: /sk-[A-Za-z0-9]{20,}/,
    label: "비밀 토큰(sk-*) 패턴이 감지되었습니다."
  },
  {
    regex: /AKIA[0-9A-Z]{16}/,
    label: "AWS Access Key 패턴이 감지되었습니다."
  },
  {
    regex: /-----BEGIN ([A-Z ]+)?PRIVATE KEY-----/,
    label: "Private key 블록이 감지되었습니다."
  }
];

const GENERIC_SECRET_ASSIGNMENT = /^\s*([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*)\s*[:=]\s*["']?([^"'\s#]{10,})/;

const SAFE_VALUE_HINT = /^(your_|change_this|changeme|example|sample|mock|dummy|test|local|localhost|postgresql:\/\/USER:)/i;

const FORBIDDEN_FILE_PATTERNS = [
  {
    test: (filePath) => {
      const base = filePath.split("/").pop() ?? filePath;
      if (!base.startsWith(".env")) {
        return false;
      }
      return !base.endsWith(".example");
    },
    label: "실환경 env 파일(.env*)은 커밋할 수 없습니다."
  },
  {
    test: (filePath) => /\.(pem|key|p12|pfx)$/i.test(filePath),
    label: "인증서/키 파일은 커밋할 수 없습니다."
  }
];

function runGit(args, asBuffer = false) {
  return execFileSync("git", args, {
    encoding: asBuffer ? "buffer" : "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
}

function getStagedFiles() {
  const output = runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  return String(output)
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

function isBinaryBuffer(buffer) {
  return buffer.includes(0);
}

function findLineFindings(filePath, text) {
  const findings = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    for (const pattern of DIRECT_SECRET_PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push(`[${filePath}:${lineNo}] ${pattern.label}`);
      }
    }

    const assignment = line.match(GENERIC_SECRET_ASSIGNMENT);
    if (assignment) {
      const [, keyName, value] = assignment;
      const normalized = value.trim();
      if (!SAFE_VALUE_HINT.test(normalized)) {
        findings.push(`[${filePath}:${lineNo}] ${keyName} 값이 실제 시크릿처럼 보입니다.`);
      }
    }
  });

  return findings;
}

function runSecurityCheck() {
  const stagedFiles = getStagedFiles();
  if (!stagedFiles.length) {
    console.log("[security-check] staged 파일이 없어 검사를 건너뜁니다.");
    return;
  }

  const findings = [];

  for (const filePath of stagedFiles) {
    for (const rule of FORBIDDEN_FILE_PATTERNS) {
      if (rule.test(filePath)) {
        findings.push(`[${filePath}] ${rule.label}`);
      }
    }

    let contentBuffer;
    try {
      contentBuffer = runGit(["show", `:${filePath}`], true);
    } catch {
      continue;
    }

    if (!(contentBuffer instanceof Buffer) || isBinaryBuffer(contentBuffer)) {
      continue;
    }

    const content = contentBuffer.toString("utf8");
    findings.push(...findLineFindings(filePath, content));
  }

  if (findings.length) {
    console.error("[security-check] 커밋 차단: 민감 정보 가능성이 감지되었습니다.");
    findings.forEach((finding) => {
      console.error(`- ${finding}`);
    });
    process.exit(1);
  }

  console.log(`[security-check] 통과 (${stagedFiles.length} files scanned)`);
}

try {
  runSecurityCheck();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[security-check] 실패: ${message}`);
  process.exit(1);
}
