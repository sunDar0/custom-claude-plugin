# Custom Claude Plugin — 프로젝트 가이드

Claude Code 플러그인을 개발하고 관리하는 모노레포.

## 프로젝트 구조

```
custom-claude-plugin/
├── .claude-plugin/
│   └── marketplace.json       # 마켓플레이스 등록 정보 (루트)
├── {plugin-name}/             # 각 플러그인 디렉토리
│   ├── .claude-plugin/
│   │   └── plugin.json        # 플러그인 메타데이터
│   ├── .mcp.json              # MCP 서버 설정
│   ├── servers/
│   │   ├── server.py          # MCP 서버 (FastMCP)
│   │   └── pyproject.toml     # Python 의존성
│   ├── skills/
│   │   └── {skill-name}/
│   │       └── skill.md       # 스킬 정의 (소문자)
│   ├── hud/                   # HUD 컴포넌트 (선택)
│   ├── README.md
│   └── LICENSE
├── .claude/                   # 하네스 (개발 도구)
│   ├── agents/                # 에이전트 정의
│   └── skills/                # 개발 워크플로우 스킬
└── CLAUDE.md                  # 이 파일
```

## 컨벤션

- **플러그인 디렉토리명**: `{name}-mcp` (MCP 서버 포함 시)
- **스킬 파일명**: `skill.md` (소문자)
- **MCP 서버**: FastMCP (Python 3.10+), `uv`로 의존성 관리
- **HUD**: Node.js (ESM), `--score-only` 플래그로 기존 HUD에 append 가능하게
- **상태 파일**: `~/.claude/mcp-servers/{plugin-name}/state.json`
- **환경변수**: `{PLUGIN_NAME}_DATA_DIR`로 데이터 디렉토리 오버라이드

## 플러그인 필수 파일

| 파일 | 필수 | 설명 |
|------|------|------|
| `.claude-plugin/plugin.json` | O | 이름, 버전, 설명, 작성자 |
| `.mcp.json` | O | MCP 서버 실행 설정 |
| `servers/server.py` | O | MCP 서버 본체 |
| `servers/pyproject.toml` | O | Python 의존성 |
| `skills/*/skill.md` | O | 스킬 정의 (1개 이상) |
| `README.md` | O | 문서 |
| `LICENSE` | - | 라이선스 (선택) |
| `hud/*.mjs` | - | HUD 컴포넌트 (선택) |

## 마켓플레이스 등록

새 플러그인 추가 시 루트 `.claude-plugin/marketplace.json`의 `plugins` 배열에 항목 추가:

```json
{
  "name": "{plugin-name}",
  "description": "...",
  "version": "1.0.0",
  "author": { "name": "...", "email": "..." },
  "source": "./{plugin-dir}",
  "category": "productivity",
  "homepage": "https://github.com/sunDar0/custom-claude-plugin",
  "tags": [...]
}
```

## 개발 워크플로우

1. `/plugin-scaffold` — 새 플러그인 스캐폴딩
2. MCP 서버 개발 (`servers/server.py`)
3. 스킬 작성 (`skills/*/skill.md`)
4. `/plugin-validate` — 구조/설정 검증
5. 마켓플레이스 등록 및 배포
