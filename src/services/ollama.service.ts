import axios, { AxiosInstance } from 'axios';
import readline from 'readline';
import { Readable } from 'stream';
import { CONFIG } from '../config/config';
import { toolsService } from './tools.service';

export interface ModelInfo {
  id: string;
  name: string;
  size?: number;
  modified_at?: string;
  details?: Record<string, any>;
  provider: 'ollama' | 'openai';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface ChatOptions {
  model: string;
  num_ctx?: number;
  temperature?: number;
  top_p?: number;
  provider?: 'ollama' | 'openai';
  customUrl?: string;
  apiKey?: string;
  tools?: string[];
}

export interface StreamEvent {
  type: 'token' | 'tool_call' | 'tool_result' | 'error' | 'done';
  content?: string;
  tool?: string;
  args?: any;
  result?: any;
  message?: string;
}

// In-memory model cache
interface CacheEntry {
  timestamp: number;
  models: ModelInfo[];
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const modelCache: Map<string, CacheEntry> = new Map();

function getClient(baseUrl: string, apiKey?: string): AxiosInstance {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return axios.create({
    baseURL: baseUrl,
    headers,
    timeout: 60000,
  });
}

export const ollamaService = {
  clearCache(): void {
    modelCache.clear();
  },

  async getModels(
    provider: 'ollama' | 'openai' = 'ollama',
    customUrl?: string,
    apiKey?: string,
    refresh = false
  ): Promise<ModelInfo[]> {
    const baseUrl =
      customUrl ||
      (provider === 'openai' ? CONFIG.OPENAI_BASE_URL : CONFIG.OLLAMA_BASE_URL);
    const effectiveApiKey = apiKey || (provider === 'openai' ? CONFIG.OPENAI_API_KEY : '');
    const cacheKey = `${provider}:${baseUrl}`;

    if (!refresh) {
      const cached = modelCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.models;
      }
    }

    const client = getClient(baseUrl, effectiveApiKey);

    try {
      let models: ModelInfo[] = [];

      if (provider === 'openai') {
        const response = await client.get('/models');
        const data = response.data?.data || [];
        models = data.map((m: any) => ({
          id: m.id,
          name: m.id,
          provider: 'openai' as const,
        }));
      } else {
        // Native Ollama endpoint
        const response = await client.get('/api/tags');
        const data = response.data?.models || [];
        models = data.map((m: any) => ({
          id: m.name,
          name: m.name,
          size: m.size,
          modified_at: m.modified_at,
          details: m.details,
          provider: 'ollama' as const,
        }));
      }

      modelCache.set(cacheKey, { timestamp: Date.now(), models });
      return models;
    } catch (error: any) {
      console.error(`Failed to fetch models from ${baseUrl} (${provider}):`, error.message);
      throw error;
    }
  },

  // Full streaming execution loop with multi-turn tool resolution
  async streamChat(
    messages: ChatMessage[],
    options: ChatOptions,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const provider = options.provider || 'ollama';
    const baseUrl =
      options.customUrl ||
      (provider === 'openai' ? CONFIG.OPENAI_BASE_URL : CONFIG.OLLAMA_BASE_URL);
    const apiKey = options.apiKey || (provider === 'openai' ? CONFIG.OPENAI_API_KEY : '');
    const client = getClient(baseUrl, apiKey);

    // Working conversation history for multi-step tool iterations
    const conversationHistory: ChatMessage[] = [...messages];
    const maxToolTurns = 5; // Guard against infinite tool loops
    let turnCount = 0;

    while (turnCount < maxToolTurns) {
      turnCount++;
      if (signal?.aborted) return;

      if (provider === 'openai') {
        const hasTools = options.tools && options.tools.length > 0;
        const requestPayload: any = {
          model: options.model,
          messages: conversationHistory,
          stream: true,
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p ?? 0.9,
        };
        if (hasTools) {
          requestPayload.tools = toolsService.toOpenAITools(options.tools);
        }

        const response = await client.post('/chat/completions', requestPayload, {
          responseType: 'stream',
          signal,
        });

        const stream: Readable = response.data;
        const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

        let currentToolCall: any = null;
        let assistantContent = '';

        for await (const line of rl) {
          if (signal?.aborted) break;
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              assistantContent += delta.content;
              onEvent({ type: 'token', content: delta.content });
            }

            if (delta.tool_calls && delta.tool_calls.length > 0) {
              for (const tc of delta.tool_calls) {
                if (!currentToolCall) {
                  currentToolCall = {
                    id: tc.id || `call_${Date.now()}`,
                    type: 'function',
                    function: {
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || '',
                    },
                  };
                } else {
                  if (tc.function?.arguments) {
                    currentToolCall.function.arguments += tc.function.arguments;
                  }
                }
              }
            }
          } catch (err) {
            // Ignore malformed chunk
          }
        }

        if (currentToolCall && currentToolCall.function.name) {
          const toolName = currentToolCall.function.name;
          let toolArgs: any = {};
          try {
            toolArgs = JSON.parse(currentToolCall.function.arguments || '{}');
          } catch {
            toolArgs = { raw: currentToolCall.function.arguments };
          }

          onEvent({ type: 'tool_call', tool: toolName, args: toolArgs });

          // Execute tool
          let toolResult: any;
          try {
            toolResult = await toolsService.execute(toolName, toolArgs);
          } catch (err: any) {
            toolResult = { error: err.message };
          }

          onEvent({ type: 'tool_result', tool: toolName, result: toolResult });

          // Append assistant message and tool response to conversation history
          conversationHistory.push({
            role: 'assistant',
            content: assistantContent || '',
            tool_calls: [currentToolCall],
          });

          conversationHistory.push({
            role: 'tool',
            name: toolName,
            tool_call_id: currentToolCall.id,
            content: JSON.stringify(toolResult),
          });

          // Continue the loop so model can interpret tool result
          continue;
        }

        // Finished without tool call
        onEvent({ type: 'done' });
        return;
      } else {
        // Native Ollama flow
        const hasTools = options.tools && options.tools.length > 0;
        const requestPayload: any = {
          model: options.model,
          messages: conversationHistory,
          stream: true,
          options: {
            num_ctx: options.num_ctx ?? 2048,
            temperature: options.temperature ?? 0.7,
            top_p: options.top_p ?? 0.9,
          },
        };
        if (hasTools) {
          requestPayload.tools = toolsService.toOllamaTools(options.tools);
        }

        const response = await client.post('/api/chat', requestPayload, {
          responseType: 'stream',
          signal,
        });

        const stream: Readable = response.data;
        const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

        let pendingToolCalls: any[] = [];
        let assistantContent = '';

        for await (const line of rl) {
          if (signal?.aborted) break;
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const data = JSON.parse(trimmed);

            // Handle tool calls from Ollama
            if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
              pendingToolCalls = data.message.tool_calls;
            }

            // Handle text tokens
            if (data.message?.content) {
              assistantContent += data.message.content;
              onEvent({ type: 'token', content: data.message.content });
            }

            if (data.done) {
              // End of stream
            }
          } catch (err) {
            // Ignore malformed line
          }
        }

        if (pendingToolCalls.length > 0) {
          for (const tc of pendingToolCalls) {
            const toolName = tc.function?.name;
            const toolArgs = tc.function?.arguments || {};

            onEvent({ type: 'tool_call', tool: toolName, args: toolArgs });

            let toolResult: any;
            try {
              toolResult = await toolsService.execute(toolName, toolArgs);
            } catch (err: any) {
              toolResult = { error: err.message };
            }

            onEvent({ type: 'tool_result', tool: toolName, result: toolResult });

            // Append assistant turn and tool execution turn
            conversationHistory.push({
              role: 'assistant',
              content: assistantContent,
              tool_calls: [tc],
            });

            conversationHistory.push({
              role: 'tool',
              content: JSON.stringify(toolResult),
            });
          }

          // Continue loop to generate assistant's natural language synthesis
          continue;
        }

        // Stream completed successfully
        onEvent({ type: 'done' });
        return;
      }
    }

    onEvent({ type: 'done' });
  },
};
