# Trust Score MCP Plugin for Claude Code

AI 코딩 어시스턴트의 신뢰도를 1000점 기준으로 수치화하여 관리하는 Claude Code 플러그인.
## 구조적 한계

### 피드백 자동 감지의 신뢰성

이 플러그인의 핵심 기능인 "피드백 자동 감지"는 **Claude가 스스로 사용자 반응을 해석하고 도구를 호출하는 구조**에 의존한다. Hook은 매 프롬프트마다 리마인더를 주입하지만, 이는 강제가 아닌 힌트이므로 Claude가 다른 작업에 집중할 경우 피드백 감지를 누락할 수 있다.

- Hook이 MCP 도구를 직접 호출하는 것은 불가 — Claude의 자발적 판단에 의존
- 키워드 기반 패턴 매칭은 오탐 위험 (예: "장황하게 설명해줘" → 부정 피드백으로 오인)
- Hook 내 LLM API 호출은 timeout(10초) 및 비용 제약

결과적으로 점수 갱신 누락이 발생할 수 있으며, 이는 현재 Claude Code 플러그인 아키텍처의 근본적 제약이다.
## 기능

- **1000점 기준 신뢰 점수** — 34개 세분화된 이벤트로 감점/가점
- **피드백 자동 감지** — 사용자 반응에서 긍정/부정을 읽어 자동 갱신
- **행동 제약 자동 적용** — 점수 구간별 자율/주의/경고 모드
- **HUD 실시간 표시** — 상태바에 점수 표시
- **히스토리 추적** — 최대 500건 변경 이력 보존

## 점수 구간

| 구간 | 상태 | 행동 제약 |
|------|------|-----------|
| 900~1000 | 🟢 신뢰 | 자율 판단 허용 (커밋/push 제외) |
| 700~899 | 🟡 주의 | 모든 행동 전 확인 필수 |
| 700 미만 | 🔴 경고 | 코드 수정도 확인 후 진행 |

## 설치

### 마켓플레이스 (권장)

```bash
/plugin marketplace add sunDar0/custom-claude-plugin
/plugin install trust-score@sunDar0-plugins
```

### 수동 설치

`~/.claude.json`에 추가:

```json
{
  "mcpServers": {
    "trust-score": {
      "command": "bash",
      "args": ["-c", "cd \"/path/to/trust-score-mcp/servers\" && npm install --silent 2>/dev/null && node server.mjs"]
    }
  }
}
```

## HUD 설정

`~/.claude/settings.json`에 추가:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/trust-score-mcp/hud/trust-hud.mjs"
  }
}
```

기존 statusLine이 있으면 파이프로 append:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash -c 'EXISTING=$(기존명령 2>/dev/null); TS=$(node /path/to/trust-score-mcp/hud/trust-hud.mjs); echo \"${EXISTING}${TS:+ | $TS}\"'"
  }
}
```

## 구조

```
trust-score-mcp/
├── .claude-plugin/plugin.json    # 플러그인 메타데이터
├── .mcp.json                     # MCP 서버 설정
├── hooks/
│   ├── hooks.json                # Hook 설정 (피드백 자동 감지)
├── servers/
│   ├── server.mjs                # MCP 서버 (Node.js, 6개 도구)
│   └── package.json              # Node.js 의존성
├── skills/trust-score/
│   ├── SKILL.md                  # 스킬 정의 (행동 규칙)
│   └── references/events.md      # 전체 이벤트 매핑
│   └── trust-score-reminder.mjs  # UserPromptSubmit hook
└── hud/
    └── trust-hud.mjs             # HUD 컴포넌트
```

## MCP 도구

| 도구 | 설명 |
|------|------|
| `trust_score_read` | 현재 점수, 구간, 행동 제약 조회 |
| `trust_score_update` | 이벤트 ID + 사유로 점수 갱신 |
| `trust_score_events` | 전체 이벤트 목록 조회 |
| `trust_score_history` | 최근 변경 이력 조회 |
| `trust_score_reset` | 점수 초기화 |
| `trust_score_hud` | HUD 표시용 문자열 |

## 동작 원리

1. **Hook** (`UserPromptSubmit`) — 매 메시지마다 현재 점수와 피드백 감지 규칙을 주입
2. **Skill** — 트리거 시 상세 행동 규칙 제공 (이벤트 매핑, 도구 사용법)
3. **MCP 도구** — 점수 읽기/쓰기/초기화 실행

Hook이 "항상 활성" 기반 규칙을 보장하고, Skill이 상세 참조를 제공하는 이중 구조.

## 이벤트 예시

### 감점
| 이벤트 | 점수 |
|--------|------|
| 지시 없이 커밋/push | -200 |
| 추측성 답변/수정 | -100 |
| 잘못된 판단 | -65 |
| 오타/표기 오류 | -3 |

### 가점
| 이벤트 | 점수 |
|--------|------|
| 명시적 칭찬 | +50 |
| 위험 사전 감지 | +42 |
| 효율적 처리 | +25 |
| 사소한 도움 | +1 |



## 요구사항

- Node.js 18+

