# Ollama Terminal-Chat (OTC) Project Progress

## Project Overview
Build a lightweight, web-based front end for the Ollama local API and OpenAI-compatible endpoints. The UI mimics a retro terminal aesthetic (monospaced fonts, high contrast, dark mode, phosphor glow, and toggleable CRT scanlines) while providing the fluid experience of a modern chat application (SSE streaming responses, command history, parameter sliders, and autonomous server-side tool orchestration). The application is containerized using Docker & Docker Compose for single-command deployment.

---

## Project Plan Progress

### Phase 1: Backend Architecture & Proxy Setup
- [x] **Ollama Connection Manager**: Configuration system in `src/config/config.ts` supporting `OLLAMA_BASE_URL` (default `http://host.docker.internal:11434`), `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and `PORT`.
- [x] **Model Registry Endpoint (`/api/models`)**:
  - In-memory 60-second caching mechanism with force-refresh support (`?refresh=true`).
  - Dual provider support: Ollama (`/api/tags`) and OpenAI-compatible endpoints (`/v1/models`).
  - Graceful 503 fallback when provider is offline.
- [x] **Request Proxy (`/api/chat`)**:
  - Full Server-Sent Events (SSE) streaming with typed JSON payloads.
  - Correct hyperparameter injection (`num_ctx`, `temperature`, `top_p`) into Ollama options and OpenAI payloads.
  - AbortController client disconnect handling.
- [x] **Tool Orchestrator & Registry**:
  - Built-in tools: `get_weather`, `read_file`, and safe `calculator`.
  - Extensible JSON schema definition and provider adapters (`toOllamaTools`, `toOpenAITools`).
  - Server-side multi-turn execution loop: detects model tool calls, executes tool, feeds result back, and streams natural language response in a single SSE connection.
  - Dedicated `/api/tools` and `/api/tools/execute` endpoints.

### Phase 2: Frontend UI/UX (The "Terminal" Aesthetic)
- [x] **Terminal Shell & CRT Styling**:
  - Full-screen retro terminal with `#0c0c0c` background, JetBrains Mono font, and toggleable CRT scanlines.
  - 4 retro color themes: Phosphor Green (`#00ff41`), Amber Cathode (`#ffb000`), Cyber Cyan (`#00f0ff`), and Monochrome (`#f0f0f0`).
- [x] **Terminal Buffer (`TerminalBuffer.tsx`)**:
  - Scrollable console buffer with retro welcome ASCII banner.
  - Command prompt lines formatted with `user@otc:~$ `.
  - Inline tool execution cards (`[EXEC] Invoking Tool...` and `[RESULT]`).
  - Streaming block cursor (`▋`) and thinking indicator.
  - Smooth auto-scrolling on new tokens and message copy actions.
- [x] **Control Drawer (`Sidebar.tsx`)**:
  - Live Model Selector dropdown with refresh button.
  - Real-time Context Window (`num_ctx`) slider (512–32,768).
  - Temperature (0.0–2.0) and Top_P (0.0–1.0) sliders.
  - Active tool toggles (`get_weather`, `read_file`, `calculator`).
  - CRT theme selector and scanlines toggle.
  - Clear Terminal Buffer action.
- [x] **Command Bar & CLI Navigation (`CommandBar.tsx`)**:
  - Bottom terminal command prompt with history navigation (<kbd>↑</kbd> / <kbd>↓</kbd>).
  - Multiline support (<kbd>Shift</kbd>+<kbd>Enter</kbd>) and Enter to send.
  - Built-in slash commands: `/help`, `/clear`, `/models`, `/tools`, `/status`, `/theme <name>`.
  - Stream interruption "Stop" button.
- [x] **Session Persistence**:
  - LocalStorage persistence for messages, hyperparameters, theme, and command history.

### Phase 3: Containerization (Docker & Docker Compose)
- [x] **Multi-Stage Dockerfile**:
  - Stage 1: Build React Vite frontend.
  - Stage 2: Compile TypeScript backend.
  - Stage 3: Minimal Node 22 Alpine runtime serving both API and static UI on `localhost:3000`.
- [x] **Docker Compose Configuration (`docker-compose.yml`)**:
  - Single-command orchestration (`docker compose up -d`).
  - `host.docker.internal:host-gateway` mapping for Linux/macOS/Windows host networking.
  - Automated health check against `/health`.
- [x] **Environment Variable Management**:
  - `.env` and `.env.example` templates with complete documentation.

### Phase 4: Testing & Documentation
- [x] **Backend Unit & Integration Tests (Jest - 24 passing)**:
  - Model registry: success, failure handling, 60s cache validation, OpenAI models.
  - Tool orchestrator: individual tool execution, calculator expressions, unknown tools, schema adapters.
  - Request proxy: parameter mapping (`num_ctx`, `temperature`, `top_p`), stream integrity, multi-turn tool loops.
  - Express API: health check, tools endpoints, 503 error formatting, static asset serving.
- [x] **Frontend Unit & Component Tests (Vitest & RTL - 7 passing)**:
  - State management: context window updates, message appending, buffer clearing.
  - UI components: auto-scroll behavior, model dropdown population, loading indicator toggle, theme persistence.
- [x] **Documentation & Architecture Records**:
  - Comprehensive `README.md` with quickstart, API reference, and testing guide.
  - `GLOSSARY.md` for project domain vocabulary.
  - Architectural Decision Records: `ADR-0001` (Unified Single-Port Serving), `ADR-0002` (Dual Provider Support), `ADR-0003` (Unified Tool Calling Adapter).
  - `AGENTS.md` and `docs/agents/` configured with GitHub issue tracker and triage labels.