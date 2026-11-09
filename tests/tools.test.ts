import { toolsService, executeTool } from '../src/services/tools.service';
import fs from 'fs';
import path from 'path';

describe('Tool Orchestrator Tests', () => {
  describe('Tool Execution Tests (Individual)', () => {
    test('test_tool_weather: should return mock weather JSON for a location', async () => {
      const result = await executeTool('get_weather', { location: 'London' });
      expect(result).toHaveProperty('location', 'London');
      expect(result).toHaveProperty('temperature');
      expect(result).toHaveProperty('condition');
      expect(result).toHaveProperty('unit', 'Celsius');
    });

    test('test_tool_file_read: should read content from existing file', async () => {
      const testFilePath = path.join(__dirname, 'dummy_test.txt');
      fs.writeFileSync(testFilePath, 'Hello OTC Test File Content', 'utf-8');

      try {
        const result = await executeTool('read_file', { path: testFilePath });
        expect(result).toHaveProperty('content');
        expect(result.content).toContain('Hello OTC Test File Content');
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('test_tool_file_read: handles non-existent file gracefully', async () => {
      const result = await executeTool('read_file', { path: '/tmp/non_existent_otc_file_123.txt' });
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('File not found');
    });

    test('test_tool_calculator: should parse and evaluate arithmetic expressions', async () => {
      const simple = await executeTool('calculator', { expression: '2 + 2 * 3' });
      expect(simple.result).toBe(8);

      const complex = await executeTool('calculator', { expression: 'sqrt(144) + 10 / 2' });
      expect(complex.result).toBe(17);
    });

    test('test_tool_calculator: handles invalid expressions gracefully', async () => {
      const result = await executeTool('calculator', { expression: 'invalid + expression' });
      expect(result).toHaveProperty('error');
    });
  });

  describe('Orchestration Logic Tests', () => {
    test('tool_selection_logic: selects correct tool from registry and executes', async () => {
      const mockLLMToolCall = {
        name: 'calculator',
        arguments: { expression: '15 * 4' },
      };

      const tool = toolsService.getTool(mockLLMToolCall.name);
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('calculator');

      const result = await toolsService.execute(mockLLMToolCall.name, mockLLMToolCall.arguments);
      expect(result.result).toBe(60);
    });

    test('tool_error_handling: returns error when unknown tool is requested', async () => {
      await expect(executeTool('non_existent_tool', {})).rejects.toThrow(
        'Tool "non_existent_tool" not found in registry'
      );
    });

    test('formats tools for Ollama correctly', () => {
      const ollamaTools = toolsService.toOllamaTools();
      expect(Array.isArray(ollamaTools)).toBe(true);
      expect(ollamaTools.length).toBeGreaterThan(0);
      expect(ollamaTools[0]).toHaveProperty('type', 'function');
      expect(ollamaTools[0].function).toHaveProperty('name');
      expect(ollamaTools[0].function).toHaveProperty('description');
      expect(ollamaTools[0].function).toHaveProperty('parameters');
    });

    test('formats tools for OpenAI correctly', () => {
      const openAiTools = toolsService.toOpenAITools();
      expect(Array.isArray(openAiTools)).toBe(true);
      expect(openAiTools.length).toBeGreaterThan(0);
      expect(openAiTools[0]).toHaveProperty('type', 'function');
      expect(openAiTools[0].function).toHaveProperty('name');
    });
  });
});
