#!/usr/bin/env node
/**
 * Trust Score Hook — runs on every user message.
 * Injects feedback detection rules as systemMessage.
 * Score display is handled by HUD, not this hook.
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
  } catch { /* default */ }
}

const constraint = score >= 900
  ? "autonomous OK (no commit/push)"
  : score >= 700
    ? "confirm before every action"
    : "confirm even before code edits";

const msg = `Detect feedback → trust_score_update. Negative→deduct, Positive→add, No correction+next instruction→implicit_accept(+15). No self-awarding. Specific reason required. Current constraint: ${constraint}`;

process.stdout.write(JSON.stringify({ systemMessage: msg }));
