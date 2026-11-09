import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config/config';
import { ollamaService, ChatMessage } from './services/ollama.service';
import { toolsService } from './services/tools.service';

dotenv.config();

export const app = express();
app.use(cors());
app.use(express.json());

// 1. Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Ollama Terminal-Chat (OTC) Backend is active',
    config: {
      ollama_base_url: CONFIG.OLLAMA_BASE_URL,
      openai_base_url: CONFIG.OPENAI_BASE_URL,
      port: CONFIG.PORT,
      debug_mode: CONFIG.DEBUG_MODE,
    },
    timestamp: new Date().toISOString(),
  });
});

// 2. Model Registry Endpoint
app.get('/api/models', async (req: Request, res: Response) => {
  const provider = (req.query.provider as 'ollama' | 'openai') || 'ollama';
  const refresh = req.query.refresh === 'true';
  const customUrl = (req.headers['x-provider-url'] as string) || (req.query.custom_url as string);
  const apiKey = (req.headers['x-api-key'] as string) || (req.query.api_key as string);

  try {
    const models = await ollamaService.getModels(provider, customUrl, apiKey, refresh);
    res.json(models);
  } catch (error: any) {
    const statusCode = error.response?.status || 503;
    res.status(statusCode).json({
      error: 'Model provider unreachable',
      message: error.message || 'Could not connect to model registry',
      provider,
      url: customUrl || (provider === 'openai' ? CONFIG.OPENAI_BASE_URL : CONFIG.OLLAMA_BASE_URL),
    });
  }
});

// 3. Tools Registry & Direct Execution Endpoints
app.get('/api/tools', (_req: Request, res: Response) => {
  const tools = toolsService.getTools().map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
  res.json(tools);
});

app.post('/api/tools/execute', async (req: Request, res: Response) => {
  const { tool_name, tool_args } = req.body;
  if (!tool_name) {
    res.status(400).json({ error: 'Missing "tool_name"' });
    return;
  }
  try {
    const result = await toolsService.execute(tool_name, tool_args);
    res.json({ tool: tool_name, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Legacy /api/tool endpoint for backwards compatibility
app.post('/api/tool', async (req: Request, res: Response) => {
  const { tool_name, tool_args } = req.body;
  try {
    const result = await toolsService.execute(tool_name, tool_args);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Chat Proxy with Real Streaming (SSE) and Tool Orchestration
app.post('/api/chat', async (req: Request, res: Response) => {
  const {
    prompt,
    messages,
    model,
    num_ctx,
    temperature,
    top_p,
    tools,
    provider = 'ollama',
    custom_url,
  } = req.body;

  const apiKey = (req.headers['x-api-key'] as string) || req.body.apiKey;
  const customUrl = (req.headers['x-provider-url'] as string) || custom_url;

  // Validate request
  if (!prompt && (!messages || messages.length === 0)) {
    res.status(400).json({ error: 'Either "prompt" or "messages" must be provided' });
    return;
  }

  // Construct standard messages array
  const chatMessages: ChatMessage[] = messages && Array.isArray(messages) && messages.length > 0
    ? messages
    : [{ role: 'user', content: prompt }];

  // Prepare SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const abortController = new AbortController();
  req.on('close', () => {
    abortController.abort();
  });

  try {
    await ollamaService.streamChat(
      chatMessages,
      {
        model: model || (provider === 'openai' ? 'gpt-4o-mini' : 'llama3'),
        num_ctx: num_ctx ? parseInt(num_ctx, 10) : 2048,
        temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
        top_p: top_p !== undefined ? parseFloat(top_p) : 0.9,
        provider,
        customUrl,
        apiKey,
        tools: Array.isArray(tools) ? tools : undefined,
      },
      (event) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      },
      abortController.signal
    );

    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error: any) {
    console.error('Chat Proxy Streaming Error:', error.message);
    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          message: error.message || 'Stream communication failed',
        })}\n\n`
      );
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// 5. Static Frontend Mount
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.use((req: Request, res: Response, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
    next();
  });
}

// 6. Server Listener
if (process.env.NODE_ENV !== 'test') {
  const PORT = CONFIG.PORT;
  app.listen(PORT, () => {
    console.log(`OTC Backend running on http://localhost:${PORT}`);
    console.log(`Configured OLLAMA_BASE_URL: ${CONFIG.OLLAMA_BASE_URL}`);
  });
}

export default app;
