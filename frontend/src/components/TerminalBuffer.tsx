import React, { useEffect, useRef } from 'react';
import { ChatMessage, ToolCallItem } from '../types';
import { Terminal, Copy, Check, Wrench, AlertCircle, Play } from 'lucide-react';

interface TerminalBufferProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  selectedModel: string;
  isOnline: boolean;
  onSelectSlashCommand?: (cmd: string) => void;
}

export const TerminalBuffer: React.FC<TerminalBufferProps> = ({
  messages,
  isStreaming,
  selectedModel,
  isOnline,
  onSelectSlashCommand,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Auto-scroll on new chunks or messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      data-testid="terminal-buffer"
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 text-sm font-mono"
    >
      {/* Welcome Banner when terminal is fresh */}
      {messages.length === 0 && (
        <div className="space-y-4 border border-[#222222] bg-[#101010]/80 p-5 rounded-lg">
          <pre className="text-[11px] leading-tight text-emerald-400 crt-glow select-none overflow-x-auto">
{`   ____  _____ ____     __  __           _      
  / __ \\|_   _/ ___|   |  \\/  | ___   __| | ___ 
 | |  | | | || |   ____| |\\/| |/ _ \\ / _\` |/ _ \\
 | |__| | | || |__|____| |  | | (_) | (_| |  __/
  \\____/  |_| \\____|   |_|  |_|\\___/ \\__,_|\\___|
  OLLAMA TERMINAL-CHAT INTERFACE // BUILD v1.0.0`}
          </pre>

          <div className="text-xs text-neutral-400 space-y-1.5 border-t border-[#222222] pt-3">
            <p>
              [SYS] Connected Model:{' '}
              <span className="text-white font-bold">{selectedModel || 'None Selected'}</span>
            </p>
            <p>
              [SYS] Daemon State:{' '}
              <span className={isOnline ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {isOnline ? 'ONLINE (Ready for prompt)' : 'OFFLINE (Ollama host unreachable)'}
              </span>
            </p>
            <p className="text-neutral-500">
              Type your query below or run <span className="text-neutral-300">/help</span> for terminal slash commands.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {['/help', '/status', '/models', '/tools', '/clear'].map((cmd) => (
              <button
                key={cmd}
                onClick={() => onSelectSlashCommand?.(cmd)}
                className="text-xs px-2.5 py-1 rounded bg-[#181818] border border-[#2e2e2e] hover:border-neutral-400 text-neutral-300 hover:text-white transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Stream */}
      {messages.map((msg) => (
        <div key={msg.id} className="space-y-2 group">
          {/* User Prompt Row */}
          {msg.role === 'user' && (
            <div className="flex items-start justify-between gap-3 text-emerald-400">
              <div className="flex items-baseline gap-2">
                <span className="text-neutral-500 select-none font-bold">user@otc:~$</span>
                <span className="text-white font-medium whitespace-pre-wrap">{msg.content}</span>
              </div>
              <button
                onClick={() => handleCopy(msg.id, msg.content)}
                className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-neutral-300 transition-opacity p-1"
                title="Copy prompt"
              >
                {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Inline Tool Execution Callouts */}
          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="space-y-2 pl-4 border-l-2 border-neutral-700/60 my-2">
              {msg.toolCalls.map((tc, idx) => (
                <div
                  key={idx}
                  className="bg-[#121212] border border-[#2b2b2b] rounded p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-amber-400 font-bold crt-glow">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>[EXEC] Invoking Tool: {tc.tool}</span>
                  </div>
                  <div className="text-neutral-400">
                    <span className="text-neutral-500 font-semibold">Args: </span>
                    <code className="text-neutral-200 bg-[#080808] px-1.5 py-0.5 rounded">
                      {JSON.stringify(tc.args)}
                    </code>
                  </div>
                  {tc.result && (
                    <div className="text-neutral-300 pt-1 border-t border-[#222222]">
                      <span className="text-emerald-400 font-semibold">[RESULT]: </span>
                      <pre className="text-[11px] bg-[#080808] p-2 rounded mt-1 overflow-x-auto text-emerald-300">
                        {typeof tc.result === 'object' ? JSON.stringify(tc.result, null, 2) : tc.result}
                      </pre>
                    </div>
                  )}
                  {tc.error && (
                    <div className="text-red-400 pt-1 border-t border-[#222222]">
                      <span className="font-semibold">[ERROR]: </span>
                      <span>{tc.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Assistant Response Row */}
          {msg.role === 'assistant' && (
            <div className="relative bg-[#101010]/50 border border-[#1f1f1f] rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-[#222222] pb-2 text-[11px] text-neutral-500">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="font-bold text-neutral-300">OTC_DAEMON // {selectedModel}</span>
                </div>
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="text-neutral-500 hover:text-neutral-300 p-1 flex items-center gap-1"
                  title="Copy response"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {msg.isStreaming && (
                  <span data-testid="streaming-cursor" className="terminal-cursor ml-1" />
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Loading Indicator while waiting for initial tokens */}
      {isStreaming && (!messages[messages.length - 1] || messages[messages.length - 1]?.role !== 'assistant') && (
        <div
          data-testid="loading-indicator"
          className="flex items-center gap-2 text-xs text-neutral-400 animate-pulse pl-2"
        >
          <span className="terminal-cursor" />
          <span>Processing query through neural pipeline...</span>
        </div>
      )}

      <div ref={bottomRef} data-testid="scroll-anchor" />
    </div>
  );
};
