#!/usr/bin/env node
/**
 * Trust Score HUD
 * - 점수만 출력한다. 기존 HUD가 뭐든 파이프로 append 가능.
 *
 * statusLine 설정 예시:
 *   기존 HUD가 있는 경우:
 *   "command": "bash -c 'HUD=$(기존명령 2>/dev/null); TS=$(node /path/to/trust-hud.mjs); echo \"${HUD}${TS:+ | $TS}\"'"
 *
 *   HUD가 없는 경우:
 *   "command": "node /path/to/trust-hud.mjs"
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const paths = [
  process.env.TRUST_SCORE_DATA_DIR,
  join(homedir(), ".claude", "mcp-servers", "trust-score"),
].filter(Boolean);

let output = "";
for (const dir of paths) {
  const statePath = join(dir, "state.json");
  if (existsSync(statePath)) {
    try {
      const state = JSON.parse(readFileSync(statePath, "utf-8"));
      const score = state.score ?? 1000;
      const emoji = score >= 900 ? "🟢" : score >= 700 ? "🟡" : "🔴";
      output = `${emoji} ${(score / 10).toFixed(1)}%`;
    } catch { /* ignore */ }
    break;
  }
}

process.stdout.write(output);
