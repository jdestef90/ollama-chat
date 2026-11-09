

# Project Plan: "Ollama Terminal-Chat" (OTC)

## 1. Project Overview
Build a lightweight, web-based front end for the Ollama local API. The UI should mimic a retro terminal aesthetic (monospaced fonts, high contrast, dark mode) but provide the fluid experience of a modern chat application (streaming responses, history, and tool selection). The application must be containerized using Docker to run as a background service.

## 2. Technical Stack Recommendations
*   **Frontend:** React.js or Next.js (for state management and fast UI updates).
*   **Styling:** Tailwind CSS (for rapid "Terminal" styling and easy Dark Mode implementation).
*   **Backend Proxy:** Node.js (Express) or Python (FastAPI). *Required to handle tool logic, CORS issues, and proxying requests to the local Ollama instance.*
*   **Communication:** Server-Sent Events (SSE) or WebSockets for real-time streaming of LLM tokens.
*   **Containerization:** Docker & Docker Compose.

## 3. Phase-by-Phase Development Plan

### Phase 1: Backend Architecture & Proxy Setup
The backend acts as the bridge between the web UI and the Ollama API.
1.  **Ollama Connection Manager:** Create a configuration system to define the `OLLAMA_BASE_URL` (defaulting to `http://host.docker.internal:11434`).
2.  **Model Registry:** Implement an endpoint to fetch available models from Ollama (`/api/tags`) and cache them for the frontend.
3.  **Request Proxy:** Create a POST endpoint that receives user prompts, model selections, and parameters (like context window), then forwards them to Ollama’s `/api/chat` or `/api/generate` endpoints.
4.  **Tool Orchestrator:** Build a "Tool Registry." This is a set of predefined functions (e.g., "Get Weather," "Read File," "Calculate") that the backend can execute if the LLM requests a tool call via the Ollama API.

### Phase 2: Frontend UI/UX (The "Terminal" Aesthetic)
1.  **Layout Design:**
    *   Full-screen dark mode (Background: `#0c0c0c`, Text: `#00ff41` or `#ffffff`).
    *   Monospaced font family (e.g., JetBrains Mono, Fira Code, or Courier New).
    *   A "Command Bar" at the bottom for input, and a "Scrollable Terminal" area for history.
2.  **Sidebar/Header Controls:**
    *   **Model Selector:** A dropdown populated by the Model Registry.
    *   **Context Window Slider:** A range input to set `num_ctx`.
    *   **Temperature/Top_P Sliders:** Basic hyperparameter controls.
    *   **Tool Toggle List:** Checkboxes to enable/disable specific tools.
3.  **Chat Component:**
    *   Implement a "Streaming Text" component that updates the terminal in real-time as tokens arrive.
    *   Auto-scroll to bottom on new messages.

### Phase 3: Feature Integration
1.  **Context & Parameter Mapping:** Ensure that when a user changes the context window or selects a model, those values are correctly injected into the JSON payload sent to Ollama.
2.  **Tool Execution Flow:**
    *   LLM generates a tool call $\rightarrow$ Backend intercepts $\rightarrow$ Backend executes local code/API $\rightarrow$ Result is fed back to LLM $\rightarrow$ Final response shown in UI.
3.  **Persistence:** Implement basic `localStorage` support so that the chat history remains visible after a page refresh.

### Phase 4: Dockerization & Deployment
1.  **Dockerfile (Frontend/Backend):** Create a multi-stage build to keep the image size small.
2.  **Docker Compose Configuration:**
    *   Service 1: The OTC Web App.
    *   Service 2: A "bridge" or simply instructions on how to point the container to the host's Ollama port.
3.  **Environment Variables:** Support `.env` files for `OLLAMA_HOST`, `PORT`, and `DEBUG_MODE`.

## 4. Specific Requirements for the LLM (Prompting Instructions)
*   **Style Guide:** "Use Tailwind CSS to create a 'Retro Terminal' look. Use a dark grey background, neon green text, and subtle scanline effects if possible."
*   **State Management:** "Use React Hooks (useState, useEffect, useReducer) to manage the chat history array and the streaming state."
*   **Error Handling:** "Provide clear UI feedback if the Ollama instance is unreachable or if a model is not found."
*   **Tooling Logic:** "Design the tool registry so that new tools can be added as simple JSON objects containing a name, description, and a handler function."

## 5. Success Criteria
*   The app starts in a browser via `localhost:3000`.
*   Users can see their local Ollama models in a dropdown.
*   Typing a prompt results in a streaming response in a terminal-style window.
*   The app can be deployed with a single `docker-compose up -d` command.

To ensure the **Ollama Terminal-Chat (OTC)** is robust, the unit tests should be divided into three main layers: **Backend Logic**, **Tool Orchestration**, and **Frontend UI/State**.

Since you are giving this to an LLM to build, providing these test cases will help the LLM write "testable" code (e.g., using dependency injection or modular functions).

---

### 1. Backend API & Proxy Tests
*Goal: Ensure the bridge between the UI and Ollama is reliable.*

*   **Model Registry Tests:**
    *   `fetch_models_success`: Verify that calling the registry returns a list of model objects (ID, Name) when Ollama is reachable.
    *   `fetch_models_failure`: Verify the API returns a `503 Service Unavailable` or custom error if the Ollama URL is incorrect/offline.
    *   `cache_validation`: If caching is implemented, verify that the registry returns cached models before hitting the Ollama API again.
*   **Request Proxy Tests:**
    *   `proxy_payload_construction`: Verify that a request from the UI (e.g., `{ prompt: "Hi", ctx: 4096 }`) is correctly transformed into the specific JSON format required by Ollama’s `/api/chat`.
    *   `parameter_injection`: Verify that `num_ctx`, `temperature`, and `top_p` are correctly mapped from the UI sliders to the API call.
    *   `stream_integrity`: Verify that the backend correctly pipes the stream from Ollama to the frontend without dropping chunks.

### 2. Tool Orchestrator Tests
*Goal: Ensure the "actions" the LLM can take actually work.*

*   **Tool Execution Tests (Individual):**
    *   `test_tool_weather`: Mock a weather API response and verify the tool returns the correct JSON format.
    *   `test_tool_file_read`: Provide a dummy file path and verify the tool reads the content correctly.
    *   `test_tool_calculator`: Verify that complex math strings are parsed and returned as numbers.
*   **Orchestration Logic Tests:**
    *   `tool_selection_logic`: Provide a mock LLM response containing a "tool call" and verify the backend selects the correct function from the registry.
    *   `tool_error_handling`: Verify that if a tool fails (e.g., "File Not Found"), the error message is formatted correctly to be sent back to the LLM so it can "explain" the error to the user.
    *   `multi_tool_sequence`: (Optional) Verify that the backend can handle a sequence of tool calls if the LLM requests multiple actions in one turn.

### 3. Frontend Component & State Tests
*Goal: Ensure the "Terminal" feels responsive and handles data correctly.*

*   **State Management Tests:**
    *   `update_context_window`: Verify that moving the slider updates the global state variable for `num_ctx`.
    *   `append_chat_message`: Verify that a new message (user or assistant) is correctly pushed to the history array.
    *   `clear_history`: Verify that the chat history array is emptied and the UI clears.
*   **UI Component Tests (Mocking API responses):**
    *   `terminal_scroll_behavior`: Verify that the terminal automatically scrolls to the bottom when a new chunk of text is received.
    *   `model_dropdown_population`: Verify that the dropdown list updates correctly when the "Refresh Models" action is triggered.
    *   `loading_state_toggle`: Verify that a "Thinking..." or "Connecting..." indicator appears while waiting for the first token from Ollama.
    *   `dark_mode_persistence`: Verify that the terminal theme remains consistent across page refreshes (using LocalStorage).

### 4. Integration & E2E (End-to-End) Tests
*Goal: The "Happy Path" verification.*

*   **The Full Loop:**
    1.  User types "What is the weather in London?"
    2.  UI sends request $\rightarrow$ Backend identifies "Weather Tool" $\rightarrow$ Tool executes $\rightarrow$ Result sent to Ollama $\rightarrow$ Ollama generates "It's 20 degrees."
    3.  **Assertion:** The final text "It's 20 degrees" appears in the terminal window.
*   **Connection Test:**
    1.  Start app with `OLLAMA_HOST` pointing to a non-existent IP.
    2.  **Assertion:** UI displays a clear "Ollama Connection Failed" error message.

---

> "Please write the code using a test-driven approach where possible. Use **Jest** or **PyTest** (depending on the chosen language) for the backend and **React Testing Library** for the frontend. Ensure that all API calls are abstracted into service functions so they can be easily mocked during testing."
