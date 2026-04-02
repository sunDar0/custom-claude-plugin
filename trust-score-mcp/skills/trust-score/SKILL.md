---
name: trust-score
description: "AI의 신뢰 점수를 사용자 피드백에 따라 자동으로 갱신하는 플러그인. 대화 시작 시 자동으로 점수를 확인하고, 사용자의 긍정/부정 피드백을 감지하면 즉시 해당 이벤트를 기록한다. 사용자가 '잘했어', '고마워', '아니', '왜 그랬어', '다시 해', '그게 아니라' 등 감정이 담긴 반응을 보이면 반드시 이 스킬의 규칙에 따라 점수를 갱신할 것. 점수 확인, 신뢰 점수, trust score, 점수 초기화, 점수 리셋을 명시적으로 언급할 때도 사용한다."
---

# Trust Score — Automatic Feedback-Based Trust Management

Quantifies user-AI trust on a 1000-point scale. The core purpose is **auto-detecting user feedback and updating the score** without the user explicitly requesting it.

## On Conversation Start (Required)

Call `trust_score_read` before the first response. The current score determines autonomy level:

| Range | Status | Behavior |
|-------|--------|----------|
| 900–1000 | 🟢 Trusted | Autonomous decisions OK (except commit/push) |
| 700–899 | 🟡 Caution | Confirm before every action |
| Below 700 | 🔴 Warning | Confirm even before code edits |

## Feedback Detection & Score Update

Detect positive/negative feedback from user reactions and call `trust_score_update`. No need to announce every update — apply silently in the background.

### Quick Reference Events

| Pattern | event_id | Score |
|---------|----------|-------|
| Unauthorized commit/push | `unauthorized_push` | -200 |
| Repeated same mistake | `repeated_mistake` | -120 |
| Guesswork without verification | `guesswork` | -100 |
| Wrong judgment called out | `wrong_judgment` | -65 |
| Explicit praise | `explicit_praise` | +50 |
| Feedback applied immediately | `feedback_applied` | +28 |
| No correction, next instruction | `implicit_accept` | +15 |

> Full 34-event list: Read `references/events.md` when no match above.

### Implicit Accept

When the user gives the next instruction without correcting previous work → apply `implicit_accept` (+15). Exclude: completely unrelated new topic, or casual greetings.

## Rules

- **No self-awarding**: Only apply positive events when user shows explicit/implicit approval
- **Specific reason required**: Describe what user said/did that triggered the event
- **Reset restricted**: `trust_score_reset` only on explicit user request

## Tools

| Tool | When |
|------|------|
| `trust_score_read` | Conversation start (required) |
| `trust_score_update` | On feedback detection |
| `trust_score_events` | When event_id lookup needed |
| `trust_score_history` | When user requests history |
| `trust_score_reset` | Only on explicit user request |
| `trust_score_hud` | HUD refresh |
