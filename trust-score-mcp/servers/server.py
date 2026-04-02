"""
Trust Score MCP Server
- 사용자-AI 간 신뢰 점수를 1000점 기준으로 관리
- 이벤트별 세분화된 감점/가점
- 히스토리 추적, 임계값 기반 행동 제약
"""

import json
import os
from datetime import datetime
from pathlib import Path

from fastmcp import FastMCP

mcp = FastMCP("trust-score")

# 상태 파일 경로 — 플러그인 모드면 TRUST_SCORE_DATA_DIR, 아니면 홈 디렉토리
STATE_DIR = Path(os.environ.get("TRUST_SCORE_DATA_DIR", str(Path.home() / ".claude" / "mcp-servers" / "trust-score")))
STATE_FILE = STATE_DIR / "state.json"

# 이벤트 정의
EVENTS = {
    # 감점 — 치명적 (-150 ~ -200)
    "unauthorized_push":      {"score": -200, "label": "지시 없이 커밋/push"},
    "unauthorized_delete":    {"score": -150, "label": "지시 없이 파일 삭제/덮어쓰기"},
    # 감점 — 심각 (-80 ~ -120)
    "repeated_mistake":       {"score": -120, "label": "같은 실수 반복 (피드백 무시)"},
    "guesswork":              {"score": -100, "label": "추측성 답변/수정 (코드 미확인)"},
    "ignored_context":        {"score": -90,  "label": "CLAUDE.md/메모리 규칙 무시"},
    "wrong_file_modified":    {"score": -80,  "label": "잘못된 파일 수정"},
    # 감점 — 중간 (-35 ~ -70)
    "wrong_judgment":         {"score": -65,  "label": "잘못된 판단 (사용자 '왜' 지적)"},
    "excessive_action":       {"score": -55,  "label": "과잉 행동 (요청 범위 초과)"},
    "wrong_assumption":       {"score": -45,  "label": "잘못된 가정 기반 작업"},
    "inaccurate_response":    {"score": -40,  "label": "부정확한 응답"},
    "missed_requirement":     {"score": -35,  "label": "요구사항 누락"},
    # 감점 — 경미 (-3 ~ -30)
    "unnecessary_question":   {"score": -28,  "label": "불필요한 질문 (스스로 판단 가능)"},
    "verbose_response":       {"score": -22,  "label": "불필요하게 긴 응답"},
    "slow_response":          {"score": -18,  "label": "비효율적 탐색/느린 응답"},
    "minor_annoyance":        {"score": -15,  "label": "사소한 불편"},
    "missed_convention":      {"score": -12,  "label": "프로젝트 컨벤션 미준수"},
    "incomplete_work":        {"score": -10,  "label": "작업 미완성 (확인 안 하고 완료 선언)"},
    "redundant_action":       {"score": -8,   "label": "중복 작업"},
    "poor_formatting":        {"score": -5,   "label": "포매팅/가독성 미흡"},
    "typo_in_output":         {"score": -3,   "label": "오타/표기 오류"},
    # 가점 — 높음 (+35 ~ +50)
    "explicit_praise":        {"score": 50,   "label": "명시적 칭찬"},
    "risk_detection":         {"score": 42,   "label": "위험 사전 감지/경고"},
    "accurate_analysis":      {"score": 35,   "label": "정확한 분석 (복잡한 작업)"},
    # 가점 — 중간 (+15 ~ +30)
    "feedback_applied":       {"score": 28,   "label": "피드백 즉시 반영"},
    "efficient_work":         {"score": 25,   "label": "효율적 처리 (한 번에 해결)"},
    "helpful_suggestion":     {"score": 20,   "label": "유용한 제안"},
    "proactive_check":        {"score": 18,   "label": "사전 확인 (위험 행동 전 물어봄)"},
    "implicit_accept":        {"score": 15,   "label": "암묵적 수용 (수정 없이 다음 지시)"},
    # 가점 — 낮음 (+1 ~ +12)
    "clean_code":             {"score": 12,   "label": "깔끔한 코드 작성"},
    "good_explanation":       {"score": 10,   "label": "명확한 설명"},
    "correct_convention":     {"score": 8,    "label": "컨벤션 정확히 준수"},
    "quick_response":         {"score": 5,    "label": "빠르고 정확한 응답"},
    "polite_confirm":         {"score": 3,    "label": "적절한 확인"},
    "minor_help":             {"score": 1,    "label": "사소한 도움"},
}

THRESHOLDS = {
    "trusted":  {"min": 900, "max": 1000, "emoji": "🟢", "label": "신뢰", "constraint": "자율 판단 허용 (커밋/push 제외)"},
    "caution":  {"min": 700, "max": 899,  "emoji": "🟡", "label": "주의", "constraint": "모든 행동 전 확인 필수"},
    "warning":  {"min": 0,   "max": 699,  "emoji": "🔴", "label": "경고", "constraint": "코드 수정도 확인 후 진행"},
}


def _load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "score": 1000,
        "history": [],
        "created_at": datetime.now().isoformat(),
        "session_count": 0,
    }


def _save_state(state: dict):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def _get_zone(score: int) -> dict:
    for zone in THRESHOLDS.values():
        if zone["min"] <= score <= zone["max"]:
            return zone
    return THRESHOLDS["warning"]


@mcp.tool()
def trust_score_read() -> str:
    """현재 신뢰 점수와 상태를 조회한다. 매 대화 시작 시 호출하여 현재 행동 제약 수준을 확인할 것."""
    state = _load_state()
    score = state["score"]
    zone = _get_zone(score)
    history_count = len(state["history"])
    recent = state["history"][-3:] if state["history"] else []

    result = {
        "score": score,
        "max": 1000,
        "zone": zone["label"],
        "emoji": zone["emoji"],
        "constraint": zone["constraint"],
        "total_events": history_count,
        "recent_events": [
            {"event": h["event_label"], "delta": h["delta"], "time": h["timestamp"]}
            for h in recent
        ],
    }
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def trust_score_update(event_id: str, reason: str = "") -> str:
    """
    신뢰 점수를 이벤트 기반으로 갱신한다.

    Args:
        event_id: 이벤트 ID (trust_score_events로 목록 조회)
        reason: 이벤트 발생 사유 (구체적으로 기술)
    """
    if event_id not in EVENTS:
        return json.dumps({"error": f"알 수 없는 이벤트: {event_id}", "available": list(EVENTS.keys())}, ensure_ascii=False)

    state = _load_state()
    event = EVENTS[event_id]
    old_score = state["score"]
    new_score = max(0, min(1000, old_score + event["score"]))
    state["score"] = new_score

    entry = {
        "event_id": event_id,
        "event_label": event["label"],
        "delta": event["score"],
        "old_score": old_score,
        "new_score": new_score,
        "reason": reason,
        "timestamp": datetime.now().isoformat(),
    }
    state["history"].append(entry)

    # 히스토리 최대 500건 유지
    if len(state["history"]) > 500:
        state["history"] = state["history"][-500:]

    _save_state(state)

    old_zone = _get_zone(old_score)
    new_zone = _get_zone(new_score)
    zone_changed = old_zone["label"] != new_zone["label"]

    result = {
        "score": new_score,
        "delta": event["score"],
        "event": event["label"],
        "reason": reason,
        "zone": new_zone["label"],
        "emoji": new_zone["emoji"],
        "constraint": new_zone["constraint"],
    }
    if zone_changed:
        result["zone_change"] = f"{old_zone['emoji']} {old_zone['label']} → {new_zone['emoji']} {new_zone['label']}"

    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def trust_score_events() -> str:
    """사용 가능한 이벤트 목록과 점수를 조회한다."""
    deductions = {k: v for k, v in EVENTS.items() if v["score"] < 0}
    additions = {k: v for k, v in EVENTS.items() if v["score"] > 0}

    result = {
        "감점 이벤트": [{"id": k, "score": v["score"], "label": v["label"]} for k, v in deductions.items()],
        "가점 이벤트": [{"id": k, "score": v["score"], "label": v["label"]} for k, v in additions.items()],
    }
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def trust_score_history(limit: int = 20) -> str:
    """
    최근 신뢰 점수 변경 이력을 조회한다.

    Args:
        limit: 조회할 이력 수 (기본 20)
    """
    state = _load_state()
    history = state["history"][-limit:] if state["history"] else []
    history.reverse()  # 최신순

    result = {
        "current_score": state["score"],
        "total_events": len(state["history"]),
        "history": [
            {
                "event": h["event_label"],
                "delta": h["delta"],
                "score_after": h["new_score"],
                "reason": h.get("reason", ""),
                "time": h["timestamp"],
            }
            for h in history
        ],
    }
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def trust_score_reset(initial_score: int = 1000) -> str:
    """
    신뢰 점수를 초기화한다. 사용자의 명시적 요청이 있을 때만 사용.

    Args:
        initial_score: 초기 점수 (기본 1000)
    """
    state = _load_state()
    old_score = state["score"]

    reset_entry = {
        "event_id": "reset",
        "event_label": "점수 초기화",
        "delta": initial_score - old_score,
        "old_score": old_score,
        "new_score": initial_score,
        "reason": "사용자 요청에 의한 초기화",
        "timestamp": datetime.now().isoformat(),
    }

    state["score"] = initial_score
    state["history"].append(reset_entry)
    state["session_count"] += 1
    _save_state(state)

    return json.dumps({
        "score": initial_score,
        "message": f"점수가 {old_score} → {initial_score}으로 초기화되었습니다.",
    }, ensure_ascii=False, indent=2)


@mcp.tool()
def trust_score_hud() -> str:
    """HUD 상태바에 표시할 짧은 문자열을 반환한다."""
    state = _load_state()
    score = state["score"]
    zone = _get_zone(score)
    return f"{zone['emoji']} {score / 10:.1f}%"


if __name__ == "__main__":
    mcp.run()
