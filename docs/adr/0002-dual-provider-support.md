# Dual Provider Support: Native Ollama and OpenAI-Compatible Endpoints

## Context and Decision
While the primary objective of OTC is local Ollama serving, many local servers (LM Studio, vLLM, LocalAI) and remote APIs (OpenAI, OpenRouter, Groq) speak the OpenAI `/v1/chat/completions` protocol. We decided to build a dual-provider adapter in the backend proxy that supports both native Ollama (`/api/chat` and `/api/tags`) and OpenAI-compatible endpoints (`/v1/chat/completions` and `/v1/models`). The frontend allows switching providers and entering an optional API key/endpoint URL stored in local session.
