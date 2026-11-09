# Ollama Terminal-Chat (OTC)

A retro terminal web interface and proxy for local Ollama instances.

## Language

**Terminal Buffer**:
The continuous scrollable display of past user inputs, assistant responses, and inline execution blocks.
_Avoid_: Chat history, message feed

**Command Bar**:
The fixed bottom console prompt where users input prompts, navigate command history, or issue slash commands.
_Avoid_: Chat input, message box

**Tool Registry**:
The server-side collection of executable functions made available to the LLM during generation turns.
_Avoid_: Plugins catalog, function store

**Model Registry**:
The cached registry of Ollama models retrieved from the local Ollama daemon.
_Avoid_: Model list, tags cache

**CRT Effect**:
The configurable visual layer rendering retro cathode-ray scanlines, phosphor tint, and text glow.
_Avoid_: Dark mode, screen filter

**Provider**:
The target LLM server protocol, supporting either native Ollama or OpenAI-compatible endpoints.
_Avoid_: Backend type, vendor

**Execution Loop**:
The server-side sequence handling prompt dispatch, tool invocation interception, local execution, and streaming token delivery.
_Avoid_: Request cycle, chat loop

