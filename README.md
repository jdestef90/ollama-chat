# Ollama Terminal-Chat (OTC)

> A lightweight, retro-terminal web interface and streaming proxy for local Ollama instances and OpenAI-compatible endpoints.

[![Node Version](https://img.shields.io/badge/node-v22+-green.svg)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/tests-31%20passing-brightgreen.svg)]()

---

## 🖥️ Overview

**Ollama Terminal-Chat (OTC)** replicates a vintage CRT terminal workstation while providing the fluid capabilities of a modern conversational AI agent: real-time Server-Sent Events (SSE) token streaming, autonomous server-side tool orchestration, hyperparameter adjustments (`num_ctx`, `temperature`, `top_p`), and single-service deployment.

### Features
* **Retro Terminal Aesthetic**: Phosphor green (`#00ff41`), Amber cathode (`#ffb000`), Cyber cyan (`#00f0ff`), and Monochrome themes on dark background (`#0c0c0c`), complete with toggleable CRT scanlines and blinking cursor (`▋`).
* **Command Bar & CLI History**: Command history recalled with <kbd>↑</kbd> and <kbd>↓</kbd> arrows, <kbd>Shift</kbd>+<kbd>Enter</kbd> multiline support, and built-in slash commands (`/help`, `/clear`, `/models`, `/tools`, `/status`, `/theme`).
* **Dual Provider Engine**:
  * **Ollama Native**: Connects to local Ollama via `/api/chat` and `/api/tags`.
  * **OpenAI-Compatible**: Seamlessly connects to vLLM, LM Studio, LocalAI, OpenRouter, or OpenAI via `/v1/chat/completions`.
* **Autonomous Tool Orchestration**: Multi-turn execution loop handled server-side within the active SSE stream. Inline CLI callouts (`[EXEC]` and `[RESULT]`) display tool progress directly in the terminal buffer:
  * `get_weather`: Location and city forecast inquiries.
  * `read_file`: Local workspace file inspector.
  * `calculator`: Safe mathematical expression evaluator.
* **Model Registry & Caching**: 60-second in-memory cache for models with instant force-refresh (`/api/models?refresh=true`).
* **Full Persistence**: Terminal buffer, selected model, hyperparameters, and theme preferences persist in `localStorage`.
* **Single-Container Deployment**: Multi-stage Docker build serving both the React UI and Express API on `http://localhost:3000`.

---

## 🚀 Quick Start

### 1. Run with Docker Compose (Recommended)

Ensure your local Ollama daemon is running on your machine:
```bash
ollama serve
```

Start OTC with a single command:
```bash
docker compose up -d
```
Open your browser at **[http://localhost:3000](http://localhost:3000)**.

To stop the container:
```bash
docker compose down
```

---

### 2. Local Development Setup

#### Prerequisites
* Node.js v20+ (tested on v22)
* npm v10+
* Local Ollama instance running on `http://localhost:11434`

#### Installation
```bash
# Clone the repository
git clone https://github.com/jdestef90/ollama-chat.git
cd ollama-chat

# Install backend dependencies
npm install

# Install frontend dependencies
npm run --prefix frontend install
```

#### Running Locally
```bash
# Terminal 1: Run Express proxy backend (Port 3000)
npm run dev

# Terminal 2: Run React Vite dev server with HMR (Port 5173)
npm run dev:frontend
```
Open [http://localhost:5173](http://localhost:5173) to access the Vite frontend with hot-reload proxying to backend on port 3000.

#### Production Build & Run
```bash
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file from the provided template:
```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama daemon URL (`http://localhost:11434` for direct host runs) |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI or OpenAI-compatible endpoint URL |
| `OPENAI_API_KEY` | *(empty)* | Optional default API key for OpenAI provider |
| `PORT` | `3000` | HTTP port for the unified server |
| `DEBUG_MODE` | `false` | Enable verbose logging |

---

## 🔌 API Reference

### Health Check
`GET /health`
```json
{
  "status": "ok",
  "message": "Ollama Terminal-Chat (OTC) Backend is active",
  "config": {
    "ollama_base_url": "http://host.docker.internal:11434",
    "openai_base_url": "https://api.openai.com/v1",
    "port": 3000,
    "debug_mode": false
  },
  "timestamp": "2026-11-08T23:30:00.000Z"
}
```

### Model Registry
`GET /api/models`
* Query parameters: `provider=ollama|openai`, `refresh=true|false`, `custom_url=<url>`
* Headers: `x-provider-url`, `x-api-key`
* Returns: Array of available models with id, name, and size.

### Chat Proxy (SSE Stream)
`POST /api/chat`
* Request Body:
```json
{
  "prompt": "What is the weather in London?",
  "model": "llama3:latest",
  "num_ctx": 4096,
  "temperature": 0.7,
  "top_p": 0.9,
  "provider": "ollama",
  "tools": ["get_weather", "calculator"]
}
```
* Response: `text/event-stream` delivering typed SSE events:
  * `{"type": "token", "content": "..."}`
  * `{"type": "tool_call", "tool": "get_weather", "args": {"location": "London"}}`
  * `{"type": "tool_result", "tool": "get_weather", "result": {...}}`
  * `{"type": "done"}`
  * `data: [DONE]`

### Tool Registry
* `GET /api/tools`: List all registered tools and parameter schemas.
* `POST /api/tools/execute`: Direct tool execution endpoint (`{ "tool_name": "calculator", "tool_args": { "expression": "2 + 2" } }`).

---

## 🧪 Testing

OTC features a 31-test automated suite across backend services, request proxies, tool orchestration, and frontend React state management.

```bash
# Run entire test suite (Backend Jest + Frontend Vitest)
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

---

## 🏛️ Architecture & Decision Records

* [GLOSSARY.md](GLOSSARY.md): Project domain dictionary.
* [ADR-0001](docs/adr/0001-unified-single-port-serving.md): Unified Single-Port Serving via Express Static Mount.
* [ADR-0002](docs/adr/0002-dual-provider-support.md): Dual Provider Support (Ollama & OpenAI-Compatible).
* [ADR-0003](docs/adr/0003-unified-tool-calling-adapter.md): Unified Tool Calling Adapter.
* [AGENTS.md](AGENTS.md): Agent engineering skills and issue tracker configuration.

---

## 📄 License
ISC
