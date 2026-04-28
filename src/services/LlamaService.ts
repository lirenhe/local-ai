/**
 * LlamaService – wraps llama.rn for on-device LLM inference.
 *
 * Lifecycle:
 *  1. Call `loadModel(modelPath, options)` once to initialise the context.
 *  2. Call `generateResponse(prompt, onToken, signal)` to stream a reply.
 *  3. Call `unloadModel()` when you want to free VRAM / RAM.
 */

import { initLlama, type LlamaContext, type TokenData } from 'llama.rn';

export interface LlamaLoadOptions {
  contextLength?: number;
  /** Use Metal GPU acceleration on Apple Silicon (iOS/macOS) */
  useGpu?: boolean;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  repeatPenalty?: number;
  systemPrompt?: string;
  /** History of previous messages as {role, content} pairs */
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

// ─── Module-level singleton ───────────────────────────────────────────────────

let _context: LlamaContext | null = null;
let _loadedModelPath: string | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a ChatML-style prompt string from history + new user message.
 * Most small GGUF models (TinyLlama, Phi-3, Gemma, Qwen2) use ChatML or a
 * close variant; we default to ChatML and let the system prompt guide the model.
 */
function buildPrompt(userMessage: string, options: GenerateOptions): string {
  const { systemPrompt, history = [] } = options;

  const lines: string[] = [];

  if (systemPrompt) {
    lines.push(`<|im_start|>system\n${systemPrompt}<|im_end|>`);
  }

  for (const msg of history) {
    lines.push(`<|im_start|>${msg.role}\n${msg.content}<|im_end|>`);
  }

  lines.push(`<|im_start|>user\n${userMessage}<|im_end|>`);
  lines.push('<|im_start|>assistant');

  return lines.join('\n');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load a GGUF model file into memory.
 * Returns true on success, throws on failure.
 */
export async function loadModel(
  modelPath: string,
  options: LlamaLoadOptions = {},
): Promise<void> {
  if (_loadedModelPath === modelPath && _context) {
    return; // already loaded
  }

  // Release any previously loaded model
  await unloadModel();

  const { contextLength = 2048, useGpu = true } = options;

  _context = await initLlama({
    model: modelPath,
    use_mlock: true,
    n_ctx: contextLength,
    n_gpu_layers: useGpu ? 99 : 0, // Metal on iOS: 99 offloads all compatible layers to GPU
  });

  _loadedModelPath = modelPath;
}

/**
 * Release the loaded model context.
 */
export async function unloadModel(): Promise<void> {
  if (_context) {
    await _context.release();
    _context = null;
    _loadedModelPath = null;
  }
}

/**
 * Returns true if a model is currently loaded.
 */
export function isModelLoaded(): boolean {
  return _context !== null;
}

/**
 * Generate a streaming response.
 *
 * @param userMessage  The latest user message
 * @param onToken      Called for each generated token string
 * @param signal       AbortSignal to cancel generation mid-stream
 * @param options      Generation parameters
 * @returns            Full generated text
 */
export async function generateResponse(
  userMessage: string,
  onToken: (token: string) => void,
  signal: AbortSignal,
  options: GenerateOptions = {},
): Promise<string> {
  if (!_context) {
    throw new Error('No model loaded. Call loadModel() first.');
  }

  const { maxTokens = 512, temperature = 0.7, topP = 0.9, repeatPenalty = 1.1 } = options;

  const prompt = buildPrompt(userMessage, options);

  let fullText = '';
  let stopped = false;

  // Allow the caller to cancel via AbortSignal
  signal.addEventListener('abort', () => {
    stopped = true;
  });

  const result = await _context.completion(
    {
      prompt,
      n_predict: maxTokens,
      temperature,
      top_p: topP,
      repeat_penalty: repeatPenalty,
      stop: ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]', '[/INST]'],
    },
    (data: TokenData) => {
      if (stopped) return;
      onToken(data.token);
      fullText += data.token;
    },
  );

  // result.text is the full generation; prefer accumulated tokens for accuracy
  return fullText || result.text;
}

/**
 * Run a one-shot (non-streaming) generation – useful for background tasks.
 */
export async function generateOnce(
  userMessage: string,
  options: GenerateOptions = {},
): Promise<string> {
  const tokens: string[] = [];
  const controller = new AbortController();
  await generateResponse(userMessage, t => tokens.push(t), controller.signal, options);
  return tokens.join('');
}
