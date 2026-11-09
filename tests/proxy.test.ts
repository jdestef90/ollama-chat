import { ollamaService } from '../src/services/ollama.service';
import { Readable } from 'stream';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Request Proxy & Streaming Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('proxy_payload_construction and parameter_injection: maps num_ctx, temperature, and top_p into Ollama options', async () => {
    let capturedPayload: any = null;

    const mockPost = jest.fn().mockImplementation((url, payload) => {
      capturedPayload = payload;
      // Return a dummy stream
      const stream = new Readable({
        read() {
          this.push(JSON.stringify({ message: { role: 'assistant', content: 'Hello human!' }, done: false }) + '\n');
          this.push(JSON.stringify({ message: { role: 'assistant', content: '' }, done: true }) + '\n');
          this.push(null);
        },
      });
      return Promise.resolve({ data: stream });
    });

    mockedAxios.create.mockReturnValue({
      post: mockPost,
    } as any);

    const events: any[] = [];
    await ollamaService.streamChat(
      [{ role: 'user', content: 'Hello' }],
      {
        model: 'llama3:8b',
        num_ctx: 4096,
        temperature: 0.85,
        top_p: 0.95,
        provider: 'ollama',
      },
      (ev) => events.push(ev)
    );

    expect(capturedPayload).toBeDefined();
    expect(capturedPayload.model).toBe('llama3:8b');
    expect(capturedPayload.stream).toBe(true);
    expect(capturedPayload.options).toEqual({
      num_ctx: 4096,
      temperature: 0.85,
      top_p: 0.95,
    });
    expect(capturedPayload.messages[0]).toEqual({ role: 'user', content: 'Hello' });
  });

  test('stream_integrity: correctly receives and emits all streamed tokens without dropping chunks', async () => {
    const chunks = ['Connecting to ', 'quantum ', 'core...', ' Ready.'];

    const mockPost = jest.fn().mockImplementation(() => {
      const stream = new Readable({
        read() {
          for (const chunk of chunks) {
            this.push(JSON.stringify({ message: { content: chunk }, done: false }) + '\n');
          }
          this.push(JSON.stringify({ done: true }) + '\n');
          this.push(null);
        },
      });
      return Promise.resolve({ data: stream });
    });

    mockedAxios.create.mockReturnValue({
      post: mockPost,
    } as any);

    const receivedTokens: string[] = [];
    let receivedDone = false;

    await ollamaService.streamChat(
      [{ role: 'user', content: 'Test stream' }],
      { model: 'llama3', provider: 'ollama' },
      (ev) => {
        if (ev.type === 'token' && ev.content) {
          receivedTokens.push(ev.content);
        }
        if (ev.type === 'done') {
          receivedDone = true;
        }
      }
    );

    expect(receivedTokens).toEqual(chunks);
    expect(receivedDone).toBe(true);
  });

  test('multi_turn_tool_execution: intercepts tool call, executes tool, and synthesizes final response', async () => {
    let callCount = 0;

    const mockPost = jest.fn().mockImplementation((url, payload) => {
      callCount++;
      if (callCount === 1) {
        // First turn: Model outputs tool call
        const stream = new Readable({
          read() {
            this.push(
              JSON.stringify({
                message: {
                  role: 'assistant',
                  content: '',
                  tool_calls: [
                    {
                      function: {
                        name: 'calculator',
                        arguments: { expression: '50 * 2' },
                      },
                    },
                  ],
                },
                done: true,
              }) + '\n'
            );
            this.push(null);
          },
        });
        return Promise.resolve({ data: stream });
      } else {
        // Second turn: Model consumes tool result and responds
        const stream = new Readable({
          read() {
            this.push(
              JSON.stringify({
                message: { role: 'assistant', content: 'The calculation result is 100.' },
                done: false,
              }) + '\n'
            );
            this.push(JSON.stringify({ done: true }) + '\n');
            this.push(null);
          },
        });
        return Promise.resolve({ data: stream });
      }
    });

    mockedAxios.create.mockReturnValue({
      post: mockPost,
    } as any);

    const events: any[] = [];
    await ollamaService.streamChat(
      [{ role: 'user', content: 'What is 50 * 2?' }],
      {
        model: 'llama3',
        tools: ['calculator'],
        provider: 'ollama',
      },
      (ev) => events.push(ev)
    );

    expect(events.some((e) => e.type === 'tool_call' && e.tool === 'calculator')).toBe(true);
    expect(events.some((e) => e.type === 'tool_result' && e.result?.result === 100)).toBe(true);
    expect(events.some((e) => e.type === 'token' && e.content.includes('100'))).toBe(true);
    expect(events.some((e) => e.type === 'done')).toBe(true);
    expect(callCount).toBe(2);
  });
});
