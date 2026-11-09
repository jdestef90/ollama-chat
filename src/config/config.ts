import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DEBUG_MODE: process.env.DEBUG_MODE === 'true',
};
