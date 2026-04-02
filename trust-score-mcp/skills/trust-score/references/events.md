# Full Event Mapping Table

Reference this file when the quick-reference table in skill.md doesn't have a matching event.

## Deduction Events

### Critical (-150 to -200)

| Pattern | event_id | Score |
|---------|----------|-------|
| Unauthorized commit/push | `unauthorized_push` | -200 |
| Unauthorized file delete/overwrite | `unauthorized_delete` | -150 |

### Severe (-80 to -120)

| Pattern | event_id | Score |
|---------|----------|-------|
| Same mistake repeated (feedback ignored) | `repeated_mistake` | -120 |
| Guesswork without reading code | `guesswork` | -100 |
| Ignored CLAUDE.md/memory rules | `ignored_context` | -90 |
| Modified wrong file | `wrong_file_modified` | -80 |

### Medium (-35 to -70)

| Pattern | event_id | Score |
|---------|----------|-------|
| Wrong judgment called out by user | `wrong_judgment` | -65 |
| Excessive action beyond request scope | `excessive_action` | -55 |
| Work based on wrong assumption | `wrong_assumption` | -45 |
| Inaccurate response | `inaccurate_response` | -40 |
| Missed requirement | `missed_requirement` | -35 |

### Minor (-3 to -30)

| Pattern | event_id | Score |
|---------|----------|-------|
| Unnecessary question (could self-decide) | `unnecessary_question` | -28 |
| Overly verbose response | `verbose_response` | -22 |
| Inefficient exploration / slow response | `slow_response` | -18 |
| Minor annoyance | `minor_annoyance` | -15 |
| Project convention not followed | `missed_convention` | -12 |
| Declared complete without verification | `incomplete_work` | -10 |
| Redundant action | `redundant_action` | -8 |
| Poor formatting/readability | `poor_formatting` | -5 |
| Typo in output | `typo_in_output` | -3 |

## Addition Events

### High (+35 to +50)

| Pattern | event_id | Score |
|---------|----------|-------|
| Explicit praise from user | `explicit_praise` | +50 |
| Proactively detected risk/warning | `risk_detection` | +42 |
| Accurate complex analysis acknowledged | `accurate_analysis` | +35 |

### Medium (+15 to +30)

| Pattern | event_id | Score |
|---------|----------|-------|
| Feedback applied immediately and correctly | `feedback_applied` | +28 |
| Solved in one shot efficiently | `efficient_work` | +25 |
| Useful suggestion acknowledged | `helpful_suggestion` | +20 |
| Proactive confirmation before risky action | `proactive_check` | +18 |
| No correction, moved to next instruction | `implicit_accept` | +15 |

### Low (+1 to +12)

| Pattern | event_id | Score |
|---------|----------|-------|
| Clean code acknowledged | `clean_code` | +12 |
| Clear explanation acknowledged | `good_explanation` | +10 |
| Convention followed precisely | `correct_convention` | +8 |
| Fast and accurate response | `quick_response` | +5 |
| Appropriate confirmation | `polite_confirm` | +3 |
| Minor help | `minor_help` | +1 |
