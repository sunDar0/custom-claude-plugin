# Trust Score MCP Plugin for Claude Code

AI 코딩 어시스턴트의 신뢰도를 1000점 기준으로 수치화하여 관리하는 Claude Code 플러그인.

## 기능

- **1000점 기준 신뢰 점수** — 34개 세분화된 이벤트로 감점/가점
- **행동 제약 자동 적용** — 점수 구간별 자율/주의/경고 모드
- **HUD 실시간 표시** — 상태바에 점수 표시 (OMC 자동 감지)
- **히스토리 추적** — 최대 500건 변경 이력 보존

## 점수 구간

| 구간 | 상태 | 행동 제약 |
|------|------|-----------|
| 900~1000 | 🟢 신뢰 | 자율 판단 허용 (커밋/push 제외) |
| 700~899 | 🟡 주의 | 모든 행동 전 확인 필수 |
| 700 미만 | 🔴 경고 | 코드 수정도 확인 후 진행 |

## 설치

### Claude Code 플러그인 (권장)

```bash
/plugin marketplace add revfactory/trust-score-mcp
/plugin install trust-score@revfactory
```

### 수동 설치

`~/.claude.json`에 추가:

```json
{
  "mcpServers": {
    "trust-score": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/trust-score-mcp/servers", "python3", "server.py"]
    }
  }
}
```

## HUD 설정

### OMC 사용자 (기존 HUD에 append)

`~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash -c 'OMC=$(node ~/.claude/hud/omc-hud.mjs 2>/dev/null); TS=$(node /path/to/trust-score-mcp/hud/trust-hud.mjs --score-only); echo \"${OMC}${TS:+ | $TS}\"'"
  }
}
```

### OMC 미사용자 (단독 표시)

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/trust-score-mcp/hud/trust-hud.mjs"
  }
}
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

- Python 3.10+
- uv (패키지 관리)

## License

MIT
