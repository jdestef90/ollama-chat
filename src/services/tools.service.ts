import fs from 'fs';
import path from 'path';

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  handler: (args: any) => Promise<any>;
}

// Safe math evaluator for calculator tool
function evaluateMath(expression: string): number {
  // Allow only digits, basic operators, parentheses, spaces, dots, and safe math functions
  const sanitized = expression.trim();
  if (!/^[\d\s+\-*/().%e^sqrtcossinabspow]+$/i.test(sanitized)) {
    throw new Error('Invalid characters in arithmetic expression');
  }

  // Replace power operator if present
  const expr = sanitized
    .replace(/\^/g, '**')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(');

  // Evaluate within a restricted context
  // eslint-disable-next-line no-new-func
  const fn = new Function('Math', `"use strict"; return (${expr});`);
  const result = fn(Math);
  if (typeof result !== 'number' || Number.isNaN(result) || !Number.isFinite(result)) {
    throw new Error('Invalid mathematical evaluation');
  }
  return result;
}

export const ToolRegistry: ToolDefinition[] = [
  {
    name: 'get_weather',
    description: 'Get the current weather and temperature forecast for a given location or city.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city or location name, e.g. London, Tokyo, New York',
        },
      },
      required: ['location'],
    },
    handler: async (args: { location?: string }) => {
      const location = args?.location || 'Unknown';
      // Deterministic mock weather generation based on location name hash
      const hash = location.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const conditions = ['Sunny', 'Partly Cloudy', 'Rainy', 'Clear Sky', 'Overcast'];
      const condition = conditions[hash % conditions.length];
      const tempC = 15 + (hash % 18);
      return {
        location,
        temperature: `${tempC}°C / ${Math.round((tempC * 9) / 5 + 32)}°F`,
        condition,
        humidity: `${40 + (hash % 45)}%`,
        unit: 'Celsius',
      };
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a local file by path.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path to read from disk',
        },
      },
      required: ['path'],
    },
    handler: async (args: { path?: string }) => {
      if (!args || !args.path) {
        throw new Error('Missing "path" parameter');
      }
      try {
        const filePath = path.isAbsolute(args.path)
          ? args.path
          : path.resolve(process.cwd(), args.path);

        if (!fs.existsSync(filePath)) {
          return { error: `File not found: ${args.path}` };
        }

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          return { error: `Path is a directory, not a file: ${args.path}` };
        }

        // Limit read size to 64KB for safety
        const content = fs.readFileSync(filePath, 'utf-8');
        const truncated = content.length > 65536 ? content.slice(0, 65536) + '\n...[TRUNCATED]' : content;
        return {
          path: args.path,
          sizeBytes: stat.size,
          content: truncated,
        };
      } catch (err: any) {
        return { error: `Failed to read file: ${err.message}` };
      }
    },
  },
  {
    name: 'calculator',
    description: 'Perform arithmetic and mathematical calculations for mathematical expressions (e.g. "45 * 12 + (30 / 2)").',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The math expression to evaluate, e.g. "2 + 2", "sqrt(144) * 5"',
        },
      },
      required: ['expression'],
    },
    handler: async (args: { expression?: string }) => {
      if (!args || !args.expression) {
        return { error: 'Missing "expression" parameter' };
      }
      try {
        const result = evaluateMath(args.expression);
        return { expression: args.expression, result };
      } catch (err: any) {
        return { error: `Calculation error: ${err.message}` };
      }
    },
  },
];

export const toolsService = {
  getTools(enabledNames?: string[]): ToolDefinition[] {
    if (!enabledNames || enabledNames.length === 0) {
      return ToolRegistry;
    }
    return ToolRegistry.filter((tool) => enabledNames.includes(tool.name));
  },

  getTool(name: string): ToolDefinition | undefined {
    return ToolRegistry.find((t) => t.name === name);
  },

  registerTool(tool: ToolDefinition): void {
    const existingIndex = ToolRegistry.findIndex((t) => t.name === tool.name);
    if (existingIndex >= 0) {
      ToolRegistry[existingIndex] = tool;
    } else {
      ToolRegistry.push(tool);
    }
  },

  // Formats tools for Ollama API (/api/chat)
  toOllamaTools(enabledNames?: string[]): any[] {
    const tools = this.getTools(enabledNames);
    return tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  },

  // Formats tools for OpenAI-compatible API (/v1/chat/completions)
  toOpenAITools(enabledNames?: string[]): any[] {
    const tools = this.getTools(enabledNames);
    return tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  },

  async execute(toolName: string, args: any): Promise<any> {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found in registry.`);
    }

    let parsedArgs = args;
    if (typeof args === 'string') {
      try {
        parsedArgs = JSON.parse(args);
      } catch {
        parsedArgs = { raw: args };
      }
    }

    try {
      return await tool.handler(parsedArgs);
    } catch (err: any) {
      return { error: err.message || 'Tool execution failed' };
    }
  },
};

export const executeTool = (name: string, args: any) => toolsService.execute(name, args);
