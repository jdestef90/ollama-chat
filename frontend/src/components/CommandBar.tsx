import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, CornerDownLeft } from 'lucide-react';

interface CommandBarProps {
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load command history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('otc_command_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    // Save to command history
    const updatedHistory = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, 50);
    setHistory(updatedHistory);
    try {
      localStorage.setItem('otc_command_history', JSON.stringify(updatedHistory));
    } catch {
      // Ignore
    }

    setHistoryIndex(-1);
    setInput('');
    onSendMessage(trimmed);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Up Arrow: Navigate previous history
    if (e.key === 'ArrowUp' && (textareaRef.current?.selectionStart === 0 || input === '')) {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
      return;
    }

    // Down Arrow: Navigate next history
    if (e.key === 'ArrowDown') {
      if (historyIndex > 0) {
        e.preventDefault();
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      } else if (historyIndex === 0) {
        e.preventDefault();
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  return (
    <footer className="border-t border-[#222222] bg-[#0c0c0c]/95 backdrop-blur p-3 md:p-4 select-none">
      <div className="max-w-5xl mx-auto flex items-end gap-2 bg-[#121212] border border-[#2a2a2a] focus-within:border-neutral-500 rounded-lg p-2 transition-colors">
        {/* Terminal Prompt Prefix */}
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-2 py-1 select-none whitespace-nowrap">
          <span>user@otc:~$</span>
        </div>

        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          data-testid="command-input"
          rows={1}
          placeholder={
            isStreaming
              ? 'Model is streaming response...'
              : 'Enter prompt or type /help for commands (Shift+Enter for newline)'
          }
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none resize-none max-h-44 py-1 font-mono"
        />

        {/* Action Button: Send or Stop */}
        {isStreaming ? (
          <button
            data-testid="stop-btn"
            onClick={onStopStreaming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
            title="Stop generation"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            data-testid="send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-white font-bold text-xs transition-colors"
            title="Send command (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        )}
      </div>

      <div className="max-w-5xl mx-auto flex items-center justify-between text-[11px] text-neutral-500 mt-2 px-1">
        <span>History: Up/Down Arrow • Newline: Shift+Enter</span>
        <span>Commands: /help, /clear, /models, /tools, /status</span>
      </div>
    </footer>
  );
};
