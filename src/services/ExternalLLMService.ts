/**
 * ExternalLLMService – sends messages to any OpenAI-compatible REST API.
 *
 * Compatible with:
 *  • OpenAI (https://api.openai.com/v1)
 *  • Ollama  (http://localhost:11434/v1)
 *  • LM Studio (http://localhost:1234/v1)
 *  • Azure OpenAI, Anthropic via proxy, etc.
 */

import axios, { type AxiosError } from 'axios';
import type { ExternalLLMConfig } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface OpenAIChatResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

interface OpenAIStreamChunk {
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

function chatUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/chat/completions`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a one-shot (non-streaming) chat completion.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  config: ExternalLLMConfig,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const { maxTokens = 1024, temperature = 0.7 } = options;

  const body: OpenAIChatRequest = {
    model: config.model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: false,
  };

  const response = await axios.post<OpenAIChatResponse>(chatUrl(config.baseUrl), body, {
    headers: buildHeaders(config.apiKey),
    timeout: 30_000,
  });

  const content = response.data.choices?.[0]?.message?.content ?? '';
  return content.trim();
}

/**
 * Send a streaming chat completion.
 * Calls `onToken` for each piece of content as it arrives.
 *
 * Note: React Native's fetch / XMLHttpRequest does not support true chunked
 * streaming. This implementation collects the full SSE response and then
 * replays tokens, which achieves the same final result and visual behaviour
 * as true streaming (tokens appear one by one in the UI) while remaining
 * compatible with the React Native HTTP stack.
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  config: ExternalLLMConfig,
  onToken: (token: string) => void,
  signal: AbortSignal,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const { maxTokens = 1024, temperature = 0.7 } = options;

  const body: OpenAIChatRequest = {
    model: config.model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: true,
  };

  const response = await axios.post<string>(chatUrl(config.baseUrl), body, {
    headers: buildHeaders(config.apiKey),
    timeout: 60_000,
    responseType: 'text',
    signal,
  });

  // Parse server-sent events (SSE) from the text response
  const lines = (response.data as string).split('\n');
  let fullText = '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') break;

    try {
      const chunk: OpenAIStreamChunk = JSON.parse(data);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        onToken(delta);
        fullText += delta;
      }
    } catch {
      // Ignore malformed chunks
    }
  }

  return fullText;
}

/**
 * Test connectivity to the external LLM endpoint.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function testConnection(
  config: ExternalLLMConfig,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await chatCompletion(
      [{ role: 'user', content: 'Say "OK" in one word.' }],
      config,
      { maxTokens: 10 },
    );
    return { ok: true };
  } catch (err) {
    const axiosErr = err as AxiosError;
    const message =
      (axiosErr.response?.data as { error?: { message?: string } })?.error?.message ??
      axiosErr.message ??
      'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * Fetch available models from an OpenAI-compatible `/models` endpoint.
 * Returns an empty array on failure (graceful degradation).
 */
export async function listModels(config: ExternalLLMConfig): Promise<string[]> {
  try {
    const base = config.baseUrl.replace(/\/$/, '');
    const response = await axios.get<{ data: Array<{ id: string }> }>(`${base}/models`, {
      headers: buildHeaders(config.apiKey),
      timeout: 10_000,
    });
    return response.data.data.map(m => m.id).sort();
  } catch {
    return [];
  }
}
