# finance-docs-mcp

금융/투자/재테크 교육 지식베이스의 MCP 서버 + 검색 엔진 + RAG 챗봇.
BM25 + 메타데이터 필터 기반. 한/영 이중 언어.

## 레포 구조

```
finance-docs-mcp/          ← 이 레포 (MCP 서버 + 검색 + RAG + 분석 파이프라인)
finance-docs/              ← 형제 레포 (Next.js 프론트엔드 + MDX 콘텐츠)
```

## 핵심 경로

| 대상 | 경로 |
|------|------|
| MDX 콘텐츠 (형제 레포) | `../finance-docs/content/docs/` |
| MCP 서버 | `src/server.ts` |
| 인덱서 | `src/indexer/` |
| 검색 엔진 | `src/retriever/` |
| MCP 도구 | `src/tools/` |
| RAG 챗봇 | `src/chat/` |
| 분석 스크립트 | `analysis/scripts/` |
| 분석 템플릿 | `analysis/templates/` |
| 기획 문서 | `docs/planning/` |
| 설계 문서 | `docs/design/` |
| 검색 인덱스 (빌드 산출물) | `data/search-index.json` |
| 설정 | `docs-mcp.config.ts` |

## 세션 규칙

1. **작업 시작 전**: `PROGRESS.md` 읽기 (없으면 생성)
2. **작업 종료 전**: `PROGRESS.md` 갱신
3. **설계 참조**: `docs/design/`, `docs/planning/`

## 기술 스택

- TypeScript only (Python 금지)
- BM25 + 메타데이터 필터 (벡터DB 없음)
- `data/search-index.json`은 빌드 산출물 (gitignore 아님 — 배포에 포함)
- 외부 API: OpenAI (챗봇 전용)
- Node.js 20+

## 명령어

| 명령어 | 용도 |
|--------|------|
| `npm run build` | TypeScript 컴파일 |
| `npm run dev` | 개발 모드 |
| `npm run reindex` | MDX → 검색 인덱스 리빌드 |
| `npm run start` | MCP 서버 시작 |

## 콘텐츠 규칙

- 특정 종목/상품명 금지
- 수치에 기준 시점 필수
- 면책 조항 모든 MDX 하단 필수
- 상세: `docs/design/QUALITY-CHECKLIST.md`, `CONTENT-TEMPLATE.md`
