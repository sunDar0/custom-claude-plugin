#!/usr/bin/env node
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
  return null;
}

let score = 1000;
const statePath = findStateFile();
if (statePath && existsSync(statePath)) {
  try { score = JSON.parse(readFileSync(statePath, "utf-8")).score ?? 1000; } catch { /* default */ }
}

process.stdout.write(JSON.stringify({ systemMessage: `●${score} feedback→trust_score_update` }));
