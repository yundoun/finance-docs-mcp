# MCP 클라이언트 설정

## Claude Code (로컬 stdio)

`.mcp.json` (프로젝트 루트):

```json
{
  "mcpServers": {
    "finance-docs": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/path/to/finance-docs-mcp"
    }
  }
}
```

## Claude Code (원격 HTTP)

`.mcp.json`:

```json
{
  "mcpServers": {
    "finance-docs": {
      "type": "streamable-http",
      "url": "https://finance-docs-mcp.fly.dev/mcp"
    }
  }
}
```

## REST API (프론트엔드 연동)

MCP 프로토콜 없이 직접 호출:

```
GET  https://finance-docs-mcp.fly.dev/health
GET  https://finance-docs-mcp.fly.dev/api/search?q=ISA&locale=ko
POST https://finance-docs-mcp.fly.dev/chat
     Body: {"messages":[{"role":"user","content":"ISA 비과세 한도는?"}]}
```

## 배포 갱신 절차

```bash
npm run reindex          # MDX → search-index.json
fly deploy --remote-only # Fly.io 재배포
```
