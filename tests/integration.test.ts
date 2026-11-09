import request from 'supertest';
import app from '../src/index';
import { ollamaService } from '../src/services/ollama.service';

describe('Express API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health: returns server status and runtime config', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body.config).toHaveProperty('ollama_base_url');
  });

  test('GET /api/tools: returns list of registered tools with parameters', async () => {
    const res = await request(app).get('/api/tools');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const names = res.body.map((t: any) => t.name);
    expect(names).toContain('get_weather');
    expect(names).toContain('read_file');
    expect(names).toContain('calculator');
  });

  test('POST /api/tools/execute: runs calculator tool successfully', async () => {
    const res = await request(app)
      .post('/api/tools/execute')
      .send({ tool_name: 'calculator', tool_args: { expression: '100 / 4' } });

    expect(res.status).toBe(200);
    expect(res.body.result).toEqual({ expression: '100 / 4', result: 25 });
  });

  test('POST /api/tools/execute: validates missing tool_name', async () => {
    const res = await request(app).post('/api/tools/execute').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/models: returns 503 when model provider is unreachable', async () => {
    jest.spyOn(ollamaService, 'getModels').mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app).get('/api/models');
    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error', 'Model provider unreachable');
  });

  test('POST /api/chat: rejects request without prompt or messages', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/chat: returns text/event-stream content-type for valid request', async () => {
    jest.spyOn(ollamaService, 'streamChat').mockImplementation(async (messages, options, onEvent) => {
      onEvent({ type: 'token', content: 'Terminal initialized.' });
      onEvent({ type: 'done' });
    });

    const res = await request(app)
      .post('/api/chat')
      .send({ prompt: 'Hello OTC' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('Terminal initialized.');
    expect(res.text).toContain('[DONE]');
  });

  test('GET /: serves the OTC Terminal Web App from frontend/dist', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Ollama Terminal-Chat (OTC)');
  });
});

