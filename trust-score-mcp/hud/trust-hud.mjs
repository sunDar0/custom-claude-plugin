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

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

function findStateFile() {
  for (const env of [process.env.TRUST_SCORE_DATA_DIR, process.env.CLAUDE_PLUGIN_DATA]) {
    if (env) {
      const p = join(env, "state.json");
      if (existsSync(p)) return p;
    }
  }
  const pluginDataDir = join(homedir(), ".claude", "plugins", "data");
  if (existsSync(pluginDataDir)) {
    try {
      const match = readdirSync(pluginDataDir).find(d => d.startsWith("trust-score"));
      if (match) {
        const p = join(pluginDataDir, match, "state.json");
        if (existsSync(p)) return p;
      }
    } catch { /* ignore */ }
  }
  return join(homedir(), ".claude", "mcp-servers", "trust-score", "state.json");
}

let score = 1000;
const statePath = findStateFile();
if (existsSync(statePath)) {
  try {
    const state = JSON.parse(readFileSync(statePath, "utf-8"));
    score = state.score ?? 1000;
  } catch { /* ignore */ }
}

const emoji = score >= 900 ? "🟢" : score >= 700 ? "🟡" : "🔴";
process.stdout.write(`${emoji} ${(score / 10).toFixed(1)}%`);
