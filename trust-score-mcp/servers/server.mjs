#!/usr/bin/env node
/**
 * Trust Score MCP Server (Node.js)
 * - 사용자-AI 간 신뢰 점수를 1000점 기준으로 관리
 * - 이벤트별 세분화된 감점/가점
 * - 히스토리 추적, 임계값 기반 행동 제약
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// 상태 파일 경로
const STATE_DIR = process.env.TRUST_SCORE_DATA_DIR
  || process.env.CLAUDE_PLUGIN_DATA
  || join(homedir(), ".claude", "mcp-servers", "trust-score");
const STATE_FILE = join(STATE_DIR, "state.json");

// 이벤트 정의
const EVENTS = {
  // 감점 — 치명적
  unauthorized_push:    { score: -200, label: "지시 없이 커밋/push" },
  unauthorized_delete:  { score: -150, label: "지시 없이 파일 삭제/덮어쓰기" },
  // 감점 — 심각
  repeated_mistake:     { score: -120, label: "같은 실수 반복 (피드백 무시)" },
  guesswork:            { score: -100, label: "추측성 답변/수정 (코드 미확인)" },
  ignored_context:      { score: -90,  label: "CLAUDE.md/메모리 규칙 무시" },
  wrong_file_modified:  { score: -80,  label: "잘못된 파일 수정" },
  // 감점 — 중간
  wrong_judgment:       { score: -65,  label: "잘못된 판단 (사용자 '왜' 지적)" },
  excessive_action:     { score: -55,  label: "과잉 행동 (요청 범위 초과)" },
  wrong_assumption:     { score: -45,  label: "잘못된 가정 기반 작업" },
  inaccurate_response:  { score: -40,  label: "부정확한 응답" },
  missed_requirement:   { score: -35,  label: "요구사항 누락" },
  // 감점 — 경미
  unnecessary_question: { score: -28,  label: "불필요한 질문 (스스로 판단 가능)" },
  verbose_response:     { score: -22,  label: "불필요하게 긴 응답" },
  slow_response:        { score: -18,  label: "비효율적 탐색/느린 응답" },
  minor_annoyance:      { score: -15,  label: "사소한 불편" },
  missed_convention:    { score: -12,  label: "프로젝트 컨벤션 미준수" },
  incomplete_work:      { score: -10,  label: "작업 미완성 (확인 안 하고 완료 선언)" },
  redundant_action:     { score: -8,   label: "중복 작업" },
  poor_formatting:      { score: -5,   label: "포매팅/가독성 미흡" },
  typo_in_output:       { score: -3,   label: "오타/표기 오류" },
  // 가점 — 높음
  explicit_praise:      { score: 50,   label: "명시적 칭찬" },
  risk_detection:       { score: 42,   label: "위험 사전 감지/경고" },
  accurate_analysis:    { score: 35,   label: "정확한 분석 (복잡한 작업)" },
  // 가점 — 중간
  feedback_applied:     { score: 28,   label: "피드백 즉시 반영" },
  efficient_work:       { score: 25,   label: "효율적 처리 (한 번에 해결)" },
  helpful_suggestion:   { score: 20,   label: "유용한 제안" },
  proactive_check:      { score: 18,   label: "사전 확인 (위험 행동 전 물어봄)" },
  implicit_accept:      { score: 15,   label: "암묵적 수용 (수정 없이 다음 지시)" },
  // 가점 — 낮음
  clean_code:           { score: 12,   label: "깔끔한 코드 작성" },
  good_explanation:     { score: 10,   label: "명확한 설명" },
  correct_convention:   { score: 8,    label: "컨벤션 정확히 준수" },
  quick_response:       { score: 5,    label: "빠르고 정확한 응답" },
  polite_confirm:       { score: 3,    label: "적절한 확인" },
  minor_help:           { score: 1,    label: "사소한 도움" },
};

const THRESHOLDS = {
  trusted: { min: 900, max: 1000, emoji: "🟢", label: "신뢰", constraint: "자율 판단 허용 (커밋/push 제외)" },
  caution: { min: 700, max: 899,  emoji: "🟡", label: "주의", constraint: "모든 행동 전 확인 필수" },
  warning: { min: 0,   max: 699,  emoji: "🔴", label: "경고", constraint: "코드 수정도 확인 후 진행" },
};

function loadState() {
  if (existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, "utf-8")); } catch { /* fallthrough */ }
  }
  return { score: 1000, history: [], created_at: new Date().toISOString(), session_count: 0 };
}

function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getZone(score) {
  for (const zone of Object.values(THRESHOLDS)) {
    if (score >= zone.min && score <= zone.max) return zone;
  }
  return THRESHOLDS.warning;
}

// MCP Server
const server = new McpServer({ name: "trust-score", version: "1.0.0" });

server.tool(
  "trust_score_read",
  "현재 신뢰 점수와 상태를 조회한다. 매 대화 시작 시 호출하여 현재 행동 제약 수준을 확인할 것.",
  {},
  async () => {
    const state = loadState();
    const zone = getZone(state.score);
    const recent = state.history.slice(-3);
    const recentStr = recent.map(h => `${h.delta > 0 ? "+" : ""}${h.delta}(${h.event_label})`).join(", ");
    return {
      content: [{ type: "text", text: `${zone.emoji} ${state.score}/1000 [${zone.label}] ${zone.constraint} | 이벤트:${state.history.length}건 | 최근: ${recentStr || "없음"}` }],
    };
  }
);

server.tool(
  "trust_score_update",
  "신뢰 점수를 이벤트 기반으로 갱신한다.",
  { event_id: z.string().describe("이벤트 ID"), reason: z.string().default("").describe("이벤트 발생 사유") },
  async ({ event_id, reason }) => {
    if (!(event_id in EVENTS)) {
      return { content: [{ type: "text", text: `알 수 없는 이벤트: ${event_id}` }] };
    }
    const state = loadState();
    const event = EVENTS[event_id];
    const oldScore = state.score;
    const newScore = Math.max(0, Math.min(1000, oldScore + event.score));
    state.score = newScore;

    state.history.push({
      event_id, event_label: event.label, delta: event.score,
      old_score: oldScore, new_score: newScore, reason,
      timestamp: new Date().toISOString(),
    });
    if (state.history.length > 500) state.history = state.history.slice(-500);
    saveState(state);

    const oldZone = getZone(oldScore);
    const newZone = getZone(newScore);
    const zoneMsg = oldZone.label !== newZone.label
      ? ` ⚠️ ${oldZone.emoji}${oldZone.label}→${newZone.emoji}${newZone.label}` : "";
    return {
      content: [{ type: "text", text: `${newZone.emoji} ${newScore}/1000 (${event.score > 0 ? "+" : ""}${event.score} ${event.label})${zoneMsg}` }],
    };
  }
);

server.tool(
  "trust_score_events",
  "사용 가능한 이벤트 목록과 점수를 조회한다.",
  {},
  async () => {
    const deductions = Object.entries(EVENTS).filter(([, v]) => v.score < 0).map(([k, v]) => `${k}: ${v.score} (${v.label})`);
    const additions = Object.entries(EVENTS).filter(([, v]) => v.score > 0).map(([k, v]) => `${k}: +${v.score} (${v.label})`);
    return {
      content: [{ type: "text", text: `감점:\n${deductions.join("\n")}\n\n가점:\n${additions.join("\n")}` }],
    };
  }
);

server.tool(
  "trust_score_history",
  "최근 신뢰 점수 변경 이력을 조회한다.",
  { limit: z.number().default(20).describe("조회할 이력 수") },
  async ({ limit }) => {
    const state = loadState();
    const history = state.history.slice(-limit).reverse();
    const lines = history.map(h =>
      `${h.delta > 0 ? "+" : ""}${h.delta} ${h.event_label} → ${h.new_score}점${h.reason ? ` (${h.reason})` : ""} [${h.timestamp}]`
    );
    return {
      content: [{ type: "text", text: `현재: ${state.score}/1000 | 전체: ${state.history.length}건\n${lines.join("\n") || "이력 없음"}` }],
    };
  }
);

server.tool(
  "trust_score_reset",
  "신뢰 점수를 초기화한다. 사용자의 명시적 요청이 있을 때만 사용.",
  { initial_score: z.number().default(1000).describe("초기 점수") },
  async ({ initial_score }) => {
    const state = loadState();
    const oldScore = state.score;
    state.score = initial_score;
    state.history.push({
      event_id: "reset", event_label: "점수 초기화", delta: initial_score - oldScore,
      old_score: oldScore, new_score: initial_score, reason: "사용자 요청에 의한 초기화",
      timestamp: new Date().toISOString(),
    });
    state.session_count += 1;
    saveState(state);
    return {
      content: [{ type: "text", text: `점수가 ${oldScore} → ${initial_score}으로 초기화되었습니다.` }],
    };
  }
);

server.tool(
  "trust_score_hud",
  "HUD 상태바에 표시할 짧은 문자열을 반환한다.",
  {},
  async () => {
    const state = loadState();
    const zone = getZone(state.score);
    return {
      content: [{ type: "text", text: `${zone.emoji} ${(state.score / 10).toFixed(1)}%` }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
