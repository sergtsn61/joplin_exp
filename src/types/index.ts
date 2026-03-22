// Joplin types
export interface JoplinNote {
  id: string;
  title: string;
  body: string;
  created_time: number;
  updated_time: number;
  parent_id: string;
  is_todo: number;
  todo_completed: number;
  tags?: JoplinTag[];
  source_url?: string;
}

export interface JoplinNotebook {
  id: string;
  title: string;
  parent_id: string;
  created_time: number;
  updated_time: number;
  children?: JoplinNotebook[];
}

export interface JoplinTag {
  id: string;
  title: string;
}

export interface JoplinConfig {
  host: string;
  port: number;
  token: string;
}

// AI types
export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'openrouter';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  contextLength?: number;
}

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  ollamaHost?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  config: AIConfig;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// App state types
export type ViewMode = 'editor' | 'preview' | 'split';
export type SortField = 'title' | 'created_time' | 'updated_time';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export interface FilterConfig {
  search: string;
  notebookId: string | null;
  tagIds: string[];
  showTodos: boolean | null;
}

export interface AppSettings {
  joplin: JoplinConfig;
  ai: AIConfig;
  editor: {
    theme: 'light' | 'dark';
    fontSize: number;
    wordWrap: boolean;
    spellCheck: boolean;
  };
}

// Export types
export type ExportFormat = 'markdown' | 'pdf' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeTags: boolean;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  noteContext?: string;
}
