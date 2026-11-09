# Unified Tool Calling Adapter

## Context and Decision
Ollama and OpenAI-compatible providers use slightly different envelopes for tool declarations and tool execution messages. Rather than duplicating tool definitions, OTC maintains a single canonical tool schema (`name`, `description`, `parameters`, `handler`) in `tools.service.ts`. The proxy transforms these definitions into the appropriate provider schema at runtime and translates model tool calls into a unified execution flow.
