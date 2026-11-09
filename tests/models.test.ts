import { ollamaService } from '../src/services/ollama.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Model Registry Tests', () => {
  beforeEach(() => {
    ollamaService.clearCache();
    jest.clearAllMocks();
  });

  test('fetch_models_success: returns a list of model objects when Ollama is reachable', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: {
        models: [
          { name: 'llama3:latest', size: 4000000000, modified_at: '2026-10-01' },
          { name: 'mistral:latest', size: 4100000000, modified_at: '2026-10-02' },
        ],
      },
    });

    mockedAxios.create.mockReturnValue({
      get: mockGet,
    } as any);

    const models = await ollamaService.getModels('ollama');
    expect(models).toHaveLength(2);
    expect(models[0]).toEqual({
      id: 'llama3:latest',
      name: 'llama3:latest',
      size: 4000000000,
      modified_at: '2026-10-01',
      details: undefined,
      provider: 'ollama',
    });
    expect(mockGet).toHaveBeenCalledWith('/api/tags');
  });

  test('fetch_models_failure: throws error when Ollama endpoint is unreachable', async () => {
    const mockGet = jest.fn().mockRejectedValue(new Error('Connection refused: ECONNREFUSED'));
    mockedAxios.create.mockReturnValue({
      get: mockGet,
    } as any);

    await expect(ollamaService.getModels('ollama')).rejects.toThrow('Connection refused');
  });

  test('cache_validation: returns cached models before hitting Ollama API again', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: {
        models: [{ name: 'codellama:7b', size: 3800000000 }],
      },
    });

    mockedAxios.create.mockReturnValue({
      get: mockGet,
    } as any);

    // First call populates cache
    const modelsFirst = await ollamaService.getModels('ollama');
    expect(modelsFirst).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Second call without refresh should use cache
    const modelsSecond = await ollamaService.getModels('ollama');
    expect(modelsSecond).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(1); // Still 1 call!

    // Third call with refresh=true forces a new API call
    const modelsThird = await ollamaService.getModels('ollama', undefined, undefined, true);
    expect(modelsThird).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(2); // Incremented to 2
  });

  test('fetch_models_openai: fetches models from OpenAI-compatible endpoint', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: {
        data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o' }],
      },
    });

    mockedAxios.create.mockReturnValue({
      get: mockGet,
    } as any);

    const models = await ollamaService.getModels('openai');
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('gpt-4o-mini');
    expect(models[0].provider).toBe('openai');
    expect(mockGet).toHaveBeenCalledWith('/models');
  });
});
