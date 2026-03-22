import axios from 'axios';
import type { AIConfig, AIMessage, AIProvider, AIModel } from '../types';

class AIService {
  async chat(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    switch (config.provider) {
      case 'openai':
        return this.chatOpenAI(messages, config, onChunk);
      case 'anthropic':
        return this.chatAnthropic(messages, config, onChunk);
      case 'ollama':
        return this.chatOllama(messages, config, onChunk);
      case 'openrouter':
        return this.chatOpenRouter(messages, config, onChunk);
      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }
  }

  private async chatOpenAI(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!config.apiKey) throw new Error('OpenAI API key is required');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2048,
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenAI API error');
    }

    if (onChunk) {
      return this.readStream(response, onChunk, 'openai');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async chatAnthropic(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!config.apiKey) throw new Error('Anthropic API key is required');

    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-haiku-4-5-20251001',
        max_tokens: config.maxTokens ?? 2048,
        system: systemMsg?.content,
        messages: userMessages,
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Anthropic API error');
    }

    if (onChunk) {
      return this.readStream(response, onChunk, 'anthropic');
    }

    const data = await response.json();
    return data.content[0].text;
  }

  private async chatOllama(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const host = config.ollamaHost || 'http://localhost:11434';

    const response = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || 'llama3.2',
        messages,
        options: {
          temperature: config.temperature ?? 0.7,
          num_predict: config.maxTokens ?? 2048,
        },
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    if (onChunk) {
      return this.readStream(response, onChunk, 'ollama');
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  private async chatOpenRouter(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!config.apiKey) throw new Error('OpenRouter API key is required');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://joplin-ai-manager',
      },
      body: JSON.stringify({
        model: config.model || 'anthropic/claude-haiku-4-5-20251001',
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2048,
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenRouter API error');
    }

    if (onChunk) {
      return this.readStream(response, onChunk, 'openai');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async readStream(
    response: Response,
    onChunk: (chunk: string) => void,
    format: 'openai' | 'anthropic' | 'ollama'
  ): Promise<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        let text = '';

        if (format === 'openai') {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            text = parsed.choices?.[0]?.delta?.content || '';
          } catch {
            continue;
          }
        } else if (format === 'anthropic') {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            text = parsed.delta?.text || '';
          } catch {
            continue;
          }
        } else if (format === 'ollama') {
          try {
            const parsed = JSON.parse(line);
            text = parsed.message?.content || '';
          } catch {
            continue;
          }
        }

        if (text) {
          fullText += text;
          onChunk(text);
        }
      }
    }

    return fullText;
  }

  async getOllamaModels(host = 'http://localhost:11434'): Promise<AIModel[]> {
    try {
      const { data } = await axios.get(`${host}/api/tags`, { timeout: 5000 });
      return (data.models || []).map((m: { name: string; size: number }) => ({
        id: m.name,
        name: m.name,
        provider: 'ollama' as AIProvider,
      }));
    } catch {
      return [];
    }
  }

  getPresetModels(): Record<AIProvider, AIModel[]> {
    return {
      openai: [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      ],
      anthropic: [
        { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'anthropic' },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic' },
        { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic' },
      ],
      ollama: [],
      openrouter: [
        { id: 'anthropic/claude-haiku-4-5-20251001', name: 'Claude Haiku (OpenRouter)', provider: 'openrouter' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (OpenRouter)', provider: 'openrouter' },
        { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', provider: 'openrouter' },
        { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', provider: 'openrouter' },
      ],
    };
  }

  buildNoteContext(noteTitle: string, noteBody: string): string {
    return `# Current Note: "${noteTitle}"\n\n${noteBody}`;
  }

  async summarizeNote(noteBody: string, config: AIConfig): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes notes concisely. Respond in the same language as the note.',
      },
      {
        role: 'user',
        content: `Please summarize this note in 2-3 sentences:\n\n${noteBody}`,
      },
    ];
    return this.chat(messages, config);
  }

  async improveNote(noteBody: string, config: AIConfig): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a writing assistant. Improve the clarity, structure, and grammar of notes while preserving their meaning. Return the improved note in Markdown format.',
      },
      {
        role: 'user',
        content: `Improve this note:\n\n${noteBody}`,
      },
    ];
    return this.chat(messages, config);
  }

  async generateTags(noteTitle: string, noteBody: string, config: AIConfig): Promise<string[]> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'Generate 3-7 relevant tags for the given note. Return only a JSON array of lowercase tag strings, nothing else.',
      },
      {
        role: 'user',
        content: `Title: ${noteTitle}\n\n${noteBody}`,
      },
    ];
    const result = await this.chat(messages, config);
    try {
      const match = result.match(/\[.*?\]/s);
      if (match) return JSON.parse(match[0]);
    } catch {
      // fallback
    }
    return result.split(',').map(t => t.trim().toLowerCase().replace(/['"]/g, '')).filter(Boolean);
  }

  async translateNote(noteBody: string, targetLanguage: string, config: AIConfig): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a professional translator. Translate the given note to ${targetLanguage}. Preserve Markdown formatting.`,
      },
      {
        role: 'user',
        content: noteBody,
      },
    ];
    return this.chat(messages, config);
  }
}

export const aiService = new AIService();
