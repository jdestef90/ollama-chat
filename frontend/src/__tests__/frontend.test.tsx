import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { Sidebar } from '../components/Sidebar';
import { TerminalBuffer } from '../components/TerminalBuffer';
import { Header } from '../components/Header';
import { AppSettings, ModelInfo, ChatMessage } from '../types';

describe('Frontend Component & State Tests', () => {
  const defaultSettings: AppSettings = {
    provider: 'ollama',
    customUrl: '',
    apiKey: '',
    selectedModel: 'llama3:latest',
    numCtx: 4096,
    temperature: 0.7,
    topP: 0.9,
    enabledTools: ['get_weather', 'calculator'],
    theme: 'green',
    scanlines: true,
  };

  const sampleModels: ModelInfo[] = [
    { id: 'llama3:latest', name: 'llama3:latest', size: 4e9, provider: 'ollama' },
    { id: 'mistral:latest', name: 'mistral:latest', size: 4.1e9, provider: 'ollama' },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('State Management Tests', () => {
    it('update_context_window: moving slider updates numCtx state and display', () => {
      const onUpdateSettings = vi.fn();
      render(
        <Sidebar
          isOpen={true}
          onClose={() => {}}
          settings={defaultSettings}
          onUpdateSettings={onUpdateSettings}
          models={sampleModels}
          isRefreshingModels={false}
          onRefreshModels={() => {}}
          onClearHistory={() => {}}
        />
      );

      const slider = screen.getByTestId('ctx-slider');
      expect(slider).toBeInTheDocument();
      expect(screen.getByTestId('ctx-value')).toHaveTextContent('4096');

      fireEvent.change(slider, { target: { value: '8192' } });
      expect(onUpdateSettings).toHaveBeenCalledWith({ numCtx: 8192 });
    });

    it('append_chat_message: pushes user and assistant messages into terminal buffer', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'What is the speed of light?', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Approximately 299,792 km/s.', timestamp: Date.now() },
      ];

      render(
        <TerminalBuffer
          messages={messages}
          isStreaming={false}
          selectedModel="llama3:latest"
          isOnline={true}
        />
      );

      expect(screen.getByText('What is the speed of light?')).toBeInTheDocument();
      expect(screen.getByText('Approximately 299,792 km/s.')).toBeInTheDocument();
    });

    it('clear_history: clicking Clear Terminal Buffer invokes clear callback and clears display', () => {
      const onClearHistory = vi.fn();
      render(
        <Sidebar
          isOpen={true}
          onClose={() => {}}
          settings={defaultSettings}
          onUpdateSettings={() => {}}
          models={sampleModels}
          isRefreshingModels={false}
          onRefreshModels={() => {}}
          onClearHistory={onClearHistory}
        />
      );

      const clearBtn = screen.getByTestId('clear-history-btn');
      fireEvent.click(clearBtn);
      expect(onClearHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('UI Component Tests', () => {
    it('terminal_scroll_behavior: scroll anchor scrolls into view when new message/chunk arrives', () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      const { rerender } = render(
        <TerminalBuffer
          messages={[{ id: '1', role: 'user', content: 'Initial message', timestamp: Date.now() }]}
          isStreaming={false}
          selectedModel="llama3"
          isOnline={true}
        />
      );

      expect(scrollIntoViewMock).toHaveBeenCalled();

      // Rerender with new streaming message
      rerender(
        <TerminalBuffer
          messages={[
            { id: '1', role: 'user', content: 'Initial message', timestamp: Date.now() },
            { id: '2', role: 'assistant', content: 'New stream chunk', timestamp: Date.now(), isStreaming: true },
          ]}
          isStreaming={true}
          selectedModel="llama3"
          isOnline={true}
        />
      );

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
    });

    it('model_dropdown_population: dropdown list populates correctly from models prop', () => {
      render(
        <Sidebar
          isOpen={true}
          onClose={() => {}}
          settings={defaultSettings}
          onUpdateSettings={() => {}}
          models={sampleModels}
          isRefreshingModels={false}
          onRefreshModels={() => {}}
          onClearHistory={() => {}}
        />
      );

      const select = screen.getByTestId('model-select');
      expect(select).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /llama3:latest/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /mistral:latest/i })).toBeInTheDocument();
    });

    it('loading_state_toggle: displays loading/thinking indicator while waiting for tokens', () => {
      render(
        <TerminalBuffer
          messages={[{ id: '1', role: 'user', content: 'Compute quantum states', timestamp: Date.now() }]}
          isStreaming={true}
          selectedModel="llama3"
          isOnline={true}
        />
      );

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.getByText(/neural pipeline/i)).toBeInTheDocument();
    });

    it('dark_mode_persistence: theme selection persists and restores from LocalStorage', async () => {
      localStorage.setItem(
        'otc_settings',
        JSON.stringify({ ...defaultSettings, theme: 'amber' })
      );

      // Mock fetch for models
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleModels,
      } as any);

      const { container } = render(<App />);

      await waitFor(() => {
        const rootDiv = container.querySelector('[data-theme]');
        expect(rootDiv).toHaveAttribute('data-theme', 'amber');
      });
    });
  });
});
