export type ThemeName = 'green' | 'amber' | 'cyan' | 'white';

export interface ModelInfo {
  id: string;
  name: string;
  size?: number;
  modified_at?: string;
  provider: 'ollama' | 'openai';
}

export interface ToolCallItem {
  tool: string;
  args: any;
  result?: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallItem[];
  isStreaming?: boolean;
}

export interface AppSettings {
  provider: 'ollama' | 'openai';
  customUrl: string;
  apiKey: string;
  selectedModel: string;
  numCtx: number;
  temperature: number;
  topP: number;
  enabledTools: string[];
  theme: ThemeName;
  scanlines: boolean;
}
