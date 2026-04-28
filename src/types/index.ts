// ─── Message Types ───────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageSource = 'local' | 'external' | 'search';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  /** Timestamp (ms since epoch) */
  timestamp: number;
  /** Which backend produced this response */
  source?: MessageSource;
  /** True while streaming a response */
  isStreaming?: boolean;
  /** Optional web search results embedded in the reply */
  searchResults?: SearchResult[];
}

// ─── Search Types ─────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ─── Model Types ─────────────────────────────────────────────────────────────

export type ModelStatus = 'not_downloaded' | 'downloading' | 'ready' | 'loading' | 'loaded' | 'error';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  /** Download URL (HuggingFace or other GGUF host) */
  downloadUrl: string;
  /** Estimated size in bytes */
  sizeBytes: number;
  /** Human-readable size (e.g. "1.1 GB") */
  sizeLabel: string;
  /** Recommended context window */
  contextLength: number;
  /** Optional system prompt suggestion */
  systemPrompt?: string;
  status: ModelStatus;
  /** Local file path once downloaded */
  localPath?: string;
  /** Download progress 0–1 */
  downloadProgress?: number;
}

// ─── Settings Types ───────────────────────────────────────────────────────────

export type InferenceBackend = 'local' | 'external';

export interface ExternalLLMConfig {
  /** Base URL of an OpenAI-compatible API (e.g. https://api.openai.com/v1) */
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AppSettings {
  /** Active inference backend */
  backend: InferenceBackend;
  /** Whether to augment responses with internet search results */
  searchEnabled: boolean;
  /** Max tokens for local inference */
  maxTokens: number;
  /** Temperature for local inference (0–1) */
  temperature: number;
  /** System prompt injected before every conversation */
  systemPrompt: string;
  /** External LLM configuration */
  externalLLM: ExternalLLMConfig;
  /** ID of the currently selected local model */
  selectedModelId: string | null;
}

// ─── Chat Store Types ─────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// ─── Navigation Types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Chat: undefined;
  Models: undefined;
  Settings: undefined;
};
