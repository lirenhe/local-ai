import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  AppSettings,
  Conversation,
  Message,
  ModelInfo,
  ModelStatus,
} from '../types';

// ─── Preset Models ────────────────────────────────────────────────────────────

export const PRESET_MODELS: Omit<ModelInfo, 'status' | 'localPath' | 'downloadProgress'>[] = [
  {
    id: 'tinyllama-1.1b-chat',
    name: 'TinyLlama 1.1B Chat',
    description:
      'Ultra-fast 1.1B parameter model. Ideal for older/low-RAM devices. ~600 MB download.',
    downloadUrl:
      'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    sizeBytes: 636_000_000,
    sizeLabel: '636 MB',
    contextLength: 2048,
    systemPrompt:
      '<|system|>\nYou are a helpful AI assistant. Answer questions concisely and accurately.</s>',
  },
  {
    id: 'phi-3-mini-4k',
    name: 'Phi-3 Mini 4K (3.8B)',
    description:
      'Microsoft Phi-3 Mini – excellent reasoning in a small package. ~2.2 GB download.',
    downloadUrl:
      'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
    sizeBytes: 2_200_000_000,
    sizeLabel: '2.2 GB',
    contextLength: 4096,
    systemPrompt:
      '<|system|>\nYou are a helpful AI assistant. Be concise, accurate, and friendly.<|end|>',
  },
  {
    id: 'gemma-2b-it',
    name: 'Gemma 2B IT',
    description:
      "Google's Gemma 2B instruction-tuned model. Great quality for its size. ~1.4 GB download.",
    downloadUrl:
      'https://huggingface.co/google/gemma-2b-it-GGUF/resolve/main/gemma-2b-it.gguf',
    sizeBytes: 1_400_000_000,
    sizeLabel: '1.4 GB',
    contextLength: 8192,
    systemPrompt: 'You are a helpful, respectful, and honest AI assistant.',
  },
  {
    id: 'qwen2-1.5b-instruct',
    name: 'Qwen2 1.5B Instruct',
    description:
      "Alibaba's Qwen2 1.5B – multilingual support, very small footprint. ~900 MB download.",
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2-1.5B-Instruct-GGUF/resolve/main/qwen2-1_5b-instruct-q4_k_m.gguf',
    sizeBytes: 930_000_000,
    sizeLabel: '930 MB',
    contextLength: 32768,
    systemPrompt: 'You are a helpful AI assistant.',
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  backend: 'local',
  searchEnabled: false,
  maxTokens: 512,
  temperature: 0.7,
  systemPrompt: 'You are a helpful AI assistant. Be concise, accurate, and friendly.',
  externalLLM: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
  },
  selectedModelId: null,
};

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // Models
  models: ModelInfo[];

  // Settings
  settings: AppSettings;

  // Generating flag
  isGenerating: boolean;

  // ── Conversation actions ──
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastMessage: (conversationId: string, patch: Partial<Message>) => void;
  clearConversation: (conversationId: string) => void;

  // ── Model actions ──
  setModelStatus: (modelId: string, status: ModelStatus, localPath?: string) => void;
  setModelDownloadProgress: (modelId: string, progress: number) => void;
  addCustomModel: (model: ModelInfo) => void;

  // ── Settings actions ──
  updateSettings: (patch: Partial<AppSettings>) => void;

  // ── Generating flag ──
  setIsGenerating: (value: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      models: PRESET_MODELS.map(m => ({ ...m, status: 'not_downloaded' as ModelStatus })),
      settings: DEFAULT_SETTINGS,
      isGenerating: false,

      // ── Conversation actions ──

      createConversation: () => {
        const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        const conversation: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set(state => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      deleteConversation: (id: string) => {
        set(state => {
          const conversations = state.conversations.filter(c => c.id !== id);
          const activeConversationId =
            state.activeConversationId === id
              ? (conversations[0]?.id ?? null)
              : state.activeConversationId;
          return { conversations, activeConversationId };
        });
      },

      setActiveConversation: (id: string) => {
        set({ activeConversationId: id });
      },

      addMessage: (conversationId: string, message: Message) => {
        set(state => ({
          conversations: state.conversations.map(c => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages, message];
            // Auto-title from the first user message
            const title =
              c.messages.length === 0 && message.role === 'user'
                ? message.content.slice(0, 60)
                : c.title;
            return { ...c, messages, title, updatedAt: Date.now() };
          }),
        }));
      },

      updateLastMessage: (conversationId: string, patch: Partial<Message>) => {
        set(state => ({
          conversations: state.conversations.map(c => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages];
            if (messages.length === 0) return c;
            messages[messages.length - 1] = { ...messages[messages.length - 1], ...patch };
            return { ...c, messages, updatedAt: Date.now() };
          }),
        }));
      },

      clearConversation: (conversationId: string) => {
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === conversationId ? { ...c, messages: [], updatedAt: Date.now() } : c,
          ),
        }));
      },

      // ── Model actions ──

      setModelStatus: (modelId: string, status: ModelStatus, localPath?: string) => {
        set(state => ({
          models: state.models.map(m =>
            m.id === modelId ? { ...m, status, ...(localPath ? { localPath } : {}) } : m,
          ),
        }));
      },

      setModelDownloadProgress: (modelId: string, progress: number) => {
        set(state => ({
          models: state.models.map(m =>
            m.id === modelId ? { ...m, downloadProgress: progress, status: 'downloading' } : m,
          ),
        }));
      },

      addCustomModel: (model: ModelInfo) => {
        set(state => ({
          models: [...state.models.filter(m => m.id !== model.id), model],
        }));
      },

      // ── Settings actions ──

      updateSettings: (patch: Partial<AppSettings>) => {
        set(state => ({ settings: { ...state.settings, ...patch } }));
      },

      // ── Generating flag ──

      setIsGenerating: (value: boolean) => {
        set({ isGenerating: value });
      },
    }),
    {
      name: 'local-ai-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist transient state
      partialize: state => {
        const { isGenerating, ...rest } = state;
        return rest;
      },
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectActiveConversation = (state: AppState): Conversation | undefined => {
  return state.conversations.find(c => c.id === state.activeConversationId);
};

export const selectSelectedModel = (state: AppState): ModelInfo | undefined => {
  return state.models.find(m => m.id === state.settings.selectedModelId);
};
