# 프론트엔드 아키텍처

> 작성일: 2026-06-18
> 핵심 원칙: **포트앤어댑터** — 모든 핵심 기능이 인터페이스로 분리되어 구현체를 교체할 수 있다.

---

## Design Decisions (확정)

| 항목 | 결정 | 비고 |
|------|------|------|
| 로고 | 텍스트 로고 (교체 가능) | `config.logo` 또는 컴포넌트 슬롯 |
| 일러스트 | 없음 (Phase 1) | 추후 카테고리별 아이콘 추가 가능 |
| 테마 | 라이트 모드 단일 | 다크모드 인프라는 갖추되 노출 안 함 |
| 챗봇 | 별도 페이지 (`/chat`) | 포트앤어댑터로 사이드패널/플로팅 교체 가능 |

---

## 1. 아키텍처 원칙

### 포트앤어댑터 (Hexagonal Architecture) 적용

```
┌─────────────────────────────────────────────────────────┐
│                    Application Core                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  SearchPort  │  │   ChatPort   │  │   DocsPort   │   │
│  │  (interface) │  │  (interface) │  │  (interface)  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                  │           │
└─────────┼─────────────────┼──────────────────┼───────────┘
          │                 │                  │
    ┌─────▼──────┐   ┌─────▼──────┐    ┌──────▼─────┐
    │  REST      │   │  SSE       │    │  Static    │
    │  Adapter   │   │  Adapter   │    │  MDX       │
    │ /api/search│   │  /chat     │    │  Adapter   │
    └────────────┘   └────────────┘    └────────────┘
```

### 핵심: 세 가지 Port

```typescript
// ── Port 1: 검색 ──
interface SearchPort {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
}

// ── Port 2: 챗봇 ──
interface ChatPort {
  sendMessage(messages: ChatMessage[]): AsyncIterable<string>  // SSE stream
}

// ── Port 3: 문서 ──
interface DocsPort {
  getDocument(path: string): Promise<DocContent | null>
  listCategories(): Promise<CategoryTree>
}
```

### Adapter 교체 시나리오

| Port | 현재 Adapter | 교체 가능 |
|------|-------------|----------|
| SearchPort | `RestSearchAdapter` (MCP 서버 REST API) | `LocalBM25Adapter` (브라우저 내 검색), `AlgoliaAdapter` |
| ChatPort | `SseChatAdapter` (MCP 서버 /chat) | `WebSocketAdapter`, `MockChatAdapter` (테스트용) |
| DocsPort | `StaticMdxAdapter` (빌드 시 MDX → 페이지) | `ApiDocsAdapter` (서버에서 동적 로드) |

---

## 2. 컴포넌트 아키텍처

### 레이어 분리

```
src/
├── ports/                    ← 인터페이스 정의 (순수 타입)
│   ├── search.ts             ← SearchPort, SearchResult, SearchOptions
│   ├── chat.ts               ← ChatPort, ChatMessage
│   └── docs.ts               ← DocsPort, DocContent, CategoryTree
│
├── adapters/                 ← 구현체 (외부 의존)
│   ├── rest-search.ts        ← fetch('/api/search')
│   ├── sse-chat.ts           ← EventSource('/chat')
│   └── static-mdx.ts        ← 빌드 시 MDX 로드
│
├── providers/                ← DI 컨텍스트 (React Context)
│   └── service-provider.tsx  ← 전체 앱에 Port 구현체 주입
│
├── hooks/                    ← Port 기반 커스텀 훅
│   ├── use-search.ts         ← useSearch(query) → SearchPort 사용
│   ├── use-chat.ts           ← useChat() → ChatPort 사용
│   └── use-docs.ts           ← useDocs() → DocsPort 사용
│
├── components/               ← 순수 UI 컴포넌트 (Port 무관)
│   ├── ui/                   ← shadcn/ui 기반 원자 컴포넌트
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   │
│   ├── layout/               ← 레이아웃 컴포넌트
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── toc.tsx           ← Table of Contents
│   │   └── footer.tsx
│   │
│   ├── doc/                  ← 문서 렌더링 컴포넌트
│   │   ├── doc-page.tsx      ← MDX 렌더링 + 메타 정보
│   │   ├── difficulty-badge.tsx
│   │   ├── summary-box.tsx   ← "한 줄 요약" 하이라이트
│   │   ├── related-cards.tsx
│   │   ├── disclaimer.tsx
│   │   └── comparison-table.tsx
│   │
│   ├── search/               ← 검색 UI
│   │   ├── search-modal.tsx  ← ⌘K 모달 (Presentational)
│   │   ├── search-result.tsx
│   │   └── search-trigger.tsx
│   │
│   └── chat/                 ← 챗봇 UI (★ 포트앤어댑터 핵심)
│       ├── chat-container.tsx     ← 챗봇 로직 (ChatPort 사용)
│       ├── chat-message.tsx       ← 메시지 버블 (순수 UI)
│       ├── chat-input.tsx         ← 입력 영역 (순수 UI)
│       │
│       ├── layouts/               ← 챗봇 레이아웃 어댑터
│       │   ├── chat-page-layout.tsx      ← /chat 전용 페이지
│       │   ├── chat-side-panel.tsx       ← 사이드 패널 (슬라이드)
│       │   └── chat-floating-button.tsx  ← 플로팅 버튼 + 팝업
│       │
│       └── index.ts           ← 현재 활성 레이아웃 export
│
├── app/                      ← Next.js App Router 페이지
│   ├── layout.tsx            ← 루트 레이아웃 (ServiceProvider 주입)
│   ├── page.tsx              ← 랜딩 페이지
│   ├── chat/
│   │   └── page.tsx          ← 챗봇 페이지
│   ├── about/
│   │   └── page.tsx          ← 프로젝트 소개
│   └── [locale]/
│       └── [...slug]/
│           └── page.tsx      ← 문서 페이지 (동적 라우팅)
│
├── config/                   ← 사이트 설정 (브랜딩, 기능 토글)
│   └── site.ts
│
├── lib/                      ← 유틸리티
│   ├── mdx.ts                ← MDX 파싱/렌더링
│   └── utils.ts              ← cn() 등
│
└── styles/
    └── globals.css           ← Tailwind + CSS 변수
```

### 챗봇 포트앤어댑터 상세

```typescript
// ── chat-container.tsx (로직, Port 사용) ──
// 이 컴포넌트는 "어디에 렌더링될지" 모름
// ChatPort를 통해 메시지를 보내고 받을 뿐

interface ChatContainerProps {
  className?: string
}

function ChatContainer({ className }: ChatContainerProps) {
  const { messages, sendMessage, isStreaming } = useChat()  // ← ChatPort 사용
  return (
    <div className={className}>
      <ChatMessageList messages={messages} />
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  )
}

// ── chat-page-layout.tsx (레이아웃 A: 전용 페이지) ──
function ChatPageLayout() {
  return (
    <div className="flex h-screen">
      <ChatHistorySidebar />
      <ChatContainer className="flex-1" />
    </div>
  )
}

// ── chat-side-panel.tsx (레이아웃 B: 사이드 패널) ──
function ChatSidePanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px]">
        <ChatContainer className="h-full" />
      </SheetContent>
    </Sheet>
  )
}

// ── chat-floating-button.tsx (레이아웃 C: 플로팅) ──
function ChatFloatingButton() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 ...">
        💬
      </button>
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-[380px] h-[500px] ...">
          <ChatContainer className="h-full" />
        </div>
      )}
    </>
  )
}
```

### 레이아웃 전환은 config 한 줄

```typescript
// config/site.ts
export const siteConfig = {
  name: "finance-docs-mcp",
  logo: { type: "text" as const, text: "Finance Docs" },

  // 챗봇 레이아웃 선택 — 이 한 줄만 바꾸면 전환
  chatLayout: "page" as "page" | "side-panel" | "floating",

  // 기능 토글
  features: {
    darkMode: false,       // 라이트 전용 (인프라는 갖춤)
    languageSwitch: true,  // KO ↔ EN
    search: true,          // ⌘K 검색
    chat: true,            // RAG 챗봇
  },
}
```

---

## 3. 데이터 흐름

### 검색 흐름

```
사용자 입력 "ISA 세제혜택"
  │
  ▼
useSearch(query)          ← Hook (debounced)
  │
  ▼
SearchPort.search(query)  ← Port Interface
  │
  ▼
RestSearchAdapter         ← Adapter (fetch)
  │  GET /api/search?q=ISA+세제혜택&locale=ko
  ▼
MCP 서버 (Fly.io)         ← 외부 서비스
  │  BM25 검색 → Top-K 결과
  ▼
SearchResult[]            ← 반환
  │
  ▼
SearchModal 렌더링        ← UI 컴포넌트
```

### 문서 렌더링 흐름 (빌드 시)

```
content/docs/ko/basics/stocks.mdx
  │
  ▼
Next.js SSG (빌드 시)     ← generateStaticParams
  │  gray-matter → frontmatter
  │  next-mdx-remote → React 컴포넌트
  ▼
/ko/basics/stocks         ← 정적 HTML (SEO 최적)
  │
  ▼
Hydration                 ← 클라이언트에서 인터랙티브
  │  ⌘K 검색, TOC 하이라이트, 관련 문서 카드
  ▼
사용자에게 표시
```

---

## 4. 분리 가능한 모듈

이 아키텍처에서 독립적으로 가져다 쓸 수 있는 모듈:

| 모듈 | 의존성 | 재사용 시나리오 |
|------|--------|-------------|
| `ports/` | 없음 (순수 타입) | 다른 프로젝트에서 동일 인터페이스로 다른 UI 구현 |
| `adapters/rest-search.ts` | fetch만 | 어떤 프론트엔드에서든 MCP 서버 연결 |
| `adapters/sse-chat.ts` | EventSource만 | 챗봇을 다른 앱에 임베드 |
| `components/chat/` | React + ports | 챗봇 UI를 다른 React 앱에 통째로 이식 |
| `components/search/` | React + ports | 검색 모달을 다른 앱에 이식 |
| `components/doc/` | React + MDX | 문서 렌더링 컴포넌트 재사용 |

---

## 5. 테스트 전략

포트앤어댑터의 가장 큰 장점: **Mock Adapter로 UI 테스트**

```typescript
// 테스트에서 Mock Adapter 주입
const mockSearch: SearchPort = {
  search: async () => [
    { title: "ISA", docPath: "ko/accounts/isa.mdx", score: 10, ... }
  ]
}

render(
  <ServiceProvider search={mockSearch}>
    <SearchModal />
  </ServiceProvider>
)
```

---

## 6. 구현 우선순위

| Phase | 구현 | 포함 컴포넌트 |
|:-----:|------|-------------|
| **F1** | 레이아웃 + 문서 렌더링 | Header, Sidebar, DocPage, Footer, TOC |
| **F2** | 검색 | SearchModal, RestSearchAdapter |
| **F3** | 챗봇 (페이지) | ChatContainer, SseChatAdapter, ChatPageLayout |
| **F4** | 랜딩 페이지 | Hero, CategoryCards, ChatPreview |
| **F5** | 챗봇 레이아웃 변형 | SidePanel, FloatingButton (config 전환) |
