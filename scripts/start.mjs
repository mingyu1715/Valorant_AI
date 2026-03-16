import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");

if (!existsSync(buildIdPath)) {
  console.error("Production build가 없습니다. 먼저 `npm run build`를 실행한 뒤 `npm start`를 실행하세요.");
  process.exit(1);
}

const nextBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next"
);

const forwardedArgs = process.argv.slice(2);
const hasPortArg = forwardedArgs.some((arg, index) => {
  const nextArg = forwardedArgs[index + 1];
  return arg === "-p" || arg === "--port" || arg.startsWith("--port=") || (arg === "-p" && Boolean(nextArg));
});

const startArgs = hasPortArg ? forwardedArgs : ["--port", process.env.PORT ?? "8000", ...forwardedArgs];

const child = spawn(nextBin, ["start", ...startArgs], {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
