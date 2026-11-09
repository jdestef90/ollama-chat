import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, ChatMessage, ModelInfo, ToolCallItem } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TerminalBuffer } from './components/TerminalBuffer';
import { CommandBar } from './components/CommandBar';

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'ollama',
  customUrl: '',
  apiKey: '',
  selectedModel: '',
  numCtx: 4096,
  temperature: 0.7,
  topP: 0.9,
  enabledTools: ['get_weather', 'calculator'],
  theme: 'green',
  scanlines: true,
};

export const App: React.FC = () => {
  // 1. Settings state with localStorage persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('otc_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  });

  // 2. Chat history with localStorage persistence
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('otc_messages');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore
    }
    return [];
  });

  // 3. UI and connectivity state
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Save settings on changes
  useEffect(() => {
    try {
      localStorage.setItem('otc_settings', JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  // Save messages on changes
  useEffect(() => {
    try {
      localStorage.setItem('otc_messages', JSON.stringify(messages));
    } catch {
      // Ignore
    }
  }, [messages]);

  // Load models from backend
  const fetchModels = async (forceRefresh = false) => {
    setIsConnecting(true);
    try {
      const params = new URLSearchParams();
      params.append('provider', settings.provider);
      if (forceRefresh) params.append('refresh', 'true');
      if (settings.customUrl) params.append('custom_url', settings.customUrl);

      const headers: Record<string, string> = {};
      if (settings.customUrl) headers['x-provider-url'] = settings.customUrl;
      if (settings.apiKey) headers['x-api-key'] = settings.apiKey;

      const res = await fetch(`/api/models?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const data: ModelInfo[] = await res.json();
      setModels(data);
      setIsOnline(true);

      // Select default model if none selected or invalid
      if (data.length > 0 && (!settings.selectedModel || !data.some((m) => m.id === settings.selectedModel))) {
        setSettings((prev) => ({ ...prev, selectedModel: data[0].id }));
      }
    } catch (err) {
      console.warn('Could not reach model registry:', err);
      setIsOnline(false);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [settings.provider]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('otc_messages');
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  // Slash commands execution
  const executeSlashCommand = (cmdText: string) => {
    const parts = cmdText.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    const userMsg: ChatMessage = {
      id: `cmd_${Date.now()}`,
      role: 'user',
      content: cmdText,
      timestamp: Date.now(),
    };

    let responseText = '';

    switch (cmd) {
      case '/help':
        responseText = `OTC Available Slash Commands:
  /help            Show this command manual
  /clear           Wipe the terminal buffer
  /models          List available models from provider
  /tools           List enabled tools & status
  /status          Check Ollama / backend health
  /theme <name>    Set CRT theme (green, amber, cyan, white)`;
        break;

      case '/clear':
        clearHistory();
        return;

      case '/models':
        if (models.length === 0) {
          responseText = '[SYS] No models found or host unreachable.';
        } else {
          responseText = `[SYS] Installed Models (${settings.provider}):\n` +
            models.map((m) => `  - ${m.name} ${m.size ? `(${Math.round(m.size / 1e9 * 10) / 10}GB)` : ''}`).join('\n');
        }
        break;

      case '/tools':
        responseText = `[SYS] Registered Tools:
  - get_weather: ${settings.enabledTools.includes('get_weather') ? '[ENABLED]' : '[DISABLED]'}
  - read_file:   ${settings.enabledTools.includes('read_file') ? '[ENABLED]' : '[DISABLED]'}
  - calculator:  ${settings.enabledTools.includes('calculator') ? '[ENABLED]' : '[DISABLED]'}`;
        break;

      case '/status':
        responseText = `[SYS] Diagnostic Status:
  Daemon:     ${isOnline ? 'CONNECTED' : 'DISCONNECTED / UNREACHABLE'}
  Provider:   ${settings.provider.toUpperCase()}
  Active Model: ${settings.selectedModel || 'None'}
  Context Win: ${settings.numCtx} tokens
  Temperature: ${settings.temperature}`;
        break;

      case '/theme':
        if (['green', 'amber', 'cyan', 'white'].includes(arg)) {
          updateSettings({ theme: arg as any });
          responseText = `[SYS] CRT Theme switched to: ${arg}`;
        } else {
          responseText = '[SYS] Invalid theme. Choose: green, amber, cyan, white';
        }
        break;

      default:
        responseText = `[SYS] Unknown slash command: ${cmd}. Type /help for available commands.`;
        break;
    }

    const sysMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, sysMsg]);
  };

  // Main Prompt Dispatch
  const handleSendMessage = async (text: string) => {
    if (text.startsWith('/')) {
      executeSlashCommand(text);
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantId = `msg_asst_${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      toolCalls: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (settings.customUrl) headers['x-provider-url'] = settings.customUrl;
      if (settings.apiKey) headers['x-api-key'] = settings.apiKey;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: text,
          model: settings.selectedModel,
          num_ctx: settings.numCtx,
          temperature: settings.temperature,
          top_p: settings.topP,
          provider: settings.provider,
          tools: settings.enabledTools,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            setIsStreaming(false);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
            );
            return;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const event = JSON.parse(trimmed.slice(6));

              if (event.type === 'token' && event.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.content }
                      : m
                  )
                );
              } else if (event.type === 'tool_call') {
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id !== assistantId) return m;
                    const existingCalls = m.toolCalls || [];
                    const newCall: ToolCallItem = {
                      tool: event.tool,
                      args: event.args,
                    };
                    return { ...m, toolCalls: [...existingCalls, newCall] };
                  })
                );
              } else if (event.type === 'tool_result') {
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id !== assistantId) return m;
                    const calls = (m.toolCalls || []).map((c) =>
                      c.tool === event.tool ? { ...c, result: event.result } : c
                    );
                    return { ...m, toolCalls: calls };
                  })
                );
              } else if (event.type === 'error') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content:
                            m.content + `\n\n[DAEMON ERROR]: ${event.message}`,
                          isStreaming: false,
                        }
                      : m
                  )
                );
              }
            } catch {
              // Ignore malformed chunk
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    m.content +
                    `\n\n[COMMUNICATION FAILURE]: ${err.message || 'Unable to connect to Ollama service.'}`,
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
      );
    }
  };

  return (
    <div
      data-theme={settings.theme}
      className="relative flex flex-col h-screen w-screen overflow-hidden bg-[#0c0c0c] text-neutral-100"
    >
      {/* Optional CRT Scanline Overlay */}
      {settings.scanlines && (
        <div className="crt-scanlines fixed inset-0 z-30 pointer-events-none opacity-60" />
      )}

      {/* Main Terminal Shell */}
      <Header
        settings={settings}
        onUpdateSettings={updateSettings}
        isOnline={isOnline}
        modelsCount={models.length}
        isConnecting={isConnecting}
        onRefreshModels={() => fetchModels(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          settings={settings}
          onUpdateSettings={updateSettings}
          models={models}
          isRefreshingModels={isConnecting}
          onRefreshModels={() => fetchModels(true)}
          onClearHistory={clearHistory}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#090909]">
          <TerminalBuffer
            messages={messages}
            isStreaming={isStreaming}
            selectedModel={settings.selectedModel}
            isOnline={isOnline}
            onSelectSlashCommand={executeSlashCommand}
          />

          <CommandBar
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            isStreaming={isStreaming}
            disabled={!isOnline && models.length === 0}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
