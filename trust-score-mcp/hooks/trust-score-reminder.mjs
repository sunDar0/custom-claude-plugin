#!/usr/bin/env node
/**
 * Trust Score Hook — runs on every user message.
 * Outputs full rules on first run / score change, minimal 1-liner otherwise.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";

const dataDir = process.env.TRUST_SCORE_DATA_DIR
  || process.env.CLAUDE_PLUGIN_DATA
  || join(homedir(), ".claude", "mcp-servers", "trust-score");

const statePath = join(dataDir, "state.json");
const cachePath = join(tmpdir(), "trust-score-last.txt");

let score = 1000;
if (existsSync(statePath)) {
  try {
    const state = JSON.parse(readFileSync(statePath, "utf-8"));
    score = state.score ?? 1000;
  } catch { /* default */ }
}

const emoji = score >= 900 ? "🟢" : score >= 700 ? "🟡" : "🔴";
const zone = score >= 900 ? "trusted" : score >= 700 ? "caution" : "warning";
const constraint = score >= 900
  ? "autonomous OK (no commit/push)"
  : score >= 700
    ? "confirm before every action"
    : "confirm even before code edits";

let lastScore = null;
if (existsSync(cachePath)) {
  try { lastScore = parseInt(readFileSync(cachePath, "utf-8"), 10); } catch { /* ignore */ }
}
try { writeFileSync(cachePath, String(score)); } catch { /* ignore */ }

const changed = lastScore === null || lastScore !== score;

if (changed) {
  process.stdout.write(`[Trust Score] ${emoji} ${score}/1000 (${zone}) — ${constraint}
Detect feedback → trust_score_update. Negative→deduct, Positive→add, No correction+next instruction→implicit_accept(+15). No self-awarding. Specific reason required.`);
} else {
  process.stdout.write(`[Trust Score] ${emoji} ${score}/1000 (${zone}) — ${constraint}`);
}
