# PROGRESS

## 현재 상태: Fly.io 배포 완료

### 완료
- [x] MDX 인덱싱 (11 docs, 48 chunks) — `npm run reindex`
- [x] Fly.io 앱 생성 (`finance-docs-mcp`, nrt 리전)
- [x] `fly.toml` 작성 + 배포 (`fly deploy --remote-only`)
- [x] OPENAI_API_KEY 시크릿 설정
- [x] 배포 검증
  - `/health` → 11 docs, 48 chunks ✓
  - `/api/search?q=ISA&locale=ko` → ISA 관련 결과 반환 ✓
  - `/chat` → RAG 스트리밍 응답 정상 ✓
- [x] MCP 연동 예시 (.mcp.json) 작성

### 배포 정보
| 항목 | 값 |
|------|-----|
| URL | https://finance-docs-mcp.fly.dev |
| MCP 엔드포인트 | https://finance-docs-mcp.fly.dev/mcp |
| 검색 API | https://finance-docs-mcp.fly.dev/api/search |
| 챗봇 API | https://finance-docs-mcp.fly.dev/chat |
| 리전 | nrt (Tokyo) |
| VM | shared-cpu-1x, 256MB |
| auto_stop | stop (유휴 시 정지) |

### 다음 단계
- [ ] finance-docs 프론트엔드에서 검색/챗봇 API 연동
- [ ] MCP 디렉토리 공식 등록
- [ ] 콘텐츠 추가 시 reindex + redeploy 자동화 (CI/CD)
