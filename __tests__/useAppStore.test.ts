/**
 * Tests for the Zustand app store.
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  mergeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiMerge: jest.fn(() => Promise.resolve()),
  flushGetRequests: jest.fn(),
}));

import { act } from 'react';
import { useAppStore, PRESET_MODELS } from '../src/store/useAppStore';

// Helper to reset store between tests
function resetStore() {
  useAppStore.setState({
    conversations: [],
    activeConversationId: null,
    models: PRESET_MODELS.map(m => ({ ...m, status: 'not_downloaded' as const })),
    settings: {
      backend: 'local',
      searchEnabled: false,
      maxTokens: 512,
      temperature: 0.7,
      systemPrompt: 'You are a helpful AI assistant.',
      externalLLM: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-3.5-turbo',
      },
      selectedModelId: null,
    },
    isGenerating: false,
  });
}

describe('useAppStore', () => {
  beforeEach(resetStore);

  // ── Conversations ──────────────────────────────────────────────────────────

  describe('createConversation', () => {
    it('creates a new conversation and sets it as active', () => {
      const { createConversation } = useAppStore.getState();
      const id = createConversation();
      const state = useAppStore.getState();
      expect(state.conversations).toHaveLength(1);
      expect(state.activeConversationId).toBe(id);
      expect(state.conversations[0].messages).toHaveLength(0);
    });

    it('prepends new conversations', () => {
      const { createConversation } = useAppStore.getState();
      createConversation();
      createConversation();
      const state = useAppStore.getState();
      expect(state.conversations).toHaveLength(2);
    });
  });

  describe('addMessage', () => {
    it('adds a message to the specified conversation', () => {
      const { createConversation, addMessage } = useAppStore.getState();
      const id = createConversation();
      addMessage(id, {
        id: 'msg1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      });
      const state = useAppStore.getState();
      const conv = state.conversations.find(c => c.id === id);
      expect(conv?.messages).toHaveLength(1);
      expect(conv?.messages[0].content).toBe('Hello');
    });

    it('sets conversation title from first user message', () => {
      const { createConversation, addMessage } = useAppStore.getState();
      const id = createConversation();
      addMessage(id, {
        id: 'msg1',
        role: 'user',
        content: 'What is the meaning of life?',
        timestamp: Date.now(),
      });
      const conv = useAppStore.getState().conversations.find(c => c.id === id);
      expect(conv?.title).toBe('What is the meaning of life?');
    });

    it('truncates long titles to 60 chars', () => {
      const { createConversation, addMessage } = useAppStore.getState();
      const id = createConversation();
      const longMessage = 'A'.repeat(100);
      addMessage(id, {
        id: 'msg1',
        role: 'user',
        content: longMessage,
        timestamp: Date.now(),
      });
      const conv = useAppStore.getState().conversations.find(c => c.id === id);
      expect(conv?.title).toHaveLength(60);
    });
  });

  describe('updateLastMessage', () => {
    it('updates the last message in a conversation', () => {
      const { createConversation, addMessage, updateLastMessage } = useAppStore.getState();
      const id = createConversation();
      addMessage(id, { id: 'msg1', role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true });
      updateLastMessage(id, { content: 'Hello world', isStreaming: false });
      const conv = useAppStore.getState().conversations.find(c => c.id === id);
      expect(conv?.messages[0].content).toBe('Hello world');
      expect(conv?.messages[0].isStreaming).toBe(false);
    });
  });

  describe('clearConversation', () => {
    it('removes all messages from a conversation', () => {
      const { createConversation, addMessage, clearConversation } = useAppStore.getState();
      const id = createConversation();
      addMessage(id, { id: 'msg1', role: 'user', content: 'Hi', timestamp: Date.now() });
      clearConversation(id);
      const conv = useAppStore.getState().conversations.find(c => c.id === id);
      expect(conv?.messages).toHaveLength(0);
    });
  });

  describe('deleteConversation', () => {
    it('removes the conversation', () => {
      const { createConversation, deleteConversation } = useAppStore.getState();
      const id = createConversation();
      deleteConversation(id);
      expect(useAppStore.getState().conversations).toHaveLength(0);
    });

    it('updates activeConversationId when deleting active conversation', () => {
      const { createConversation, deleteConversation } = useAppStore.getState();
      createConversation(); // first
      const id2 = createConversation(); // second (now active)
      deleteConversation(id2);
      // Should now point to first conversation
      const state = useAppStore.getState();
      expect(state.activeConversationId).not.toBe(id2);
    });
  });

  // ── Models ─────────────────────────────────────────────────────────────────

  describe('setModelStatus', () => {
    it('updates model status', () => {
      const { setModelStatus } = useAppStore.getState();
      const modelId = PRESET_MODELS[0].id;
      setModelStatus(modelId, 'downloading');
      const model = useAppStore.getState().models.find(m => m.id === modelId);
      expect(model?.status).toBe('downloading');
    });

    it('sets localPath when provided', () => {
      const { setModelStatus } = useAppStore.getState();
      const modelId = PRESET_MODELS[0].id;
      setModelStatus(modelId, 'ready', '/path/to/model.gguf');
      const model = useAppStore.getState().models.find(m => m.id === modelId);
      expect(model?.localPath).toBe('/path/to/model.gguf');
    });
  });

  describe('setModelDownloadProgress', () => {
    it('sets download progress and status to downloading', () => {
      const { setModelDownloadProgress } = useAppStore.getState();
      const modelId = PRESET_MODELS[0].id;
      setModelDownloadProgress(modelId, 0.5);
      const model = useAppStore.getState().models.find(m => m.id === modelId);
      expect(model?.downloadProgress).toBe(0.5);
      expect(model?.status).toBe('downloading');
    });
  });

  // ── Settings ───────────────────────────────────────────────────────────────

  describe('updateSettings', () => {
    it('merges partial settings update', () => {
      const { updateSettings } = useAppStore.getState();
      updateSettings({ backend: 'external', searchEnabled: true });
      const { settings } = useAppStore.getState();
      expect(settings.backend).toBe('external');
      expect(settings.searchEnabled).toBe(true);
      // Other settings unchanged
      expect(settings.maxTokens).toBe(512);
    });
  });

  // ── isGenerating ───────────────────────────────────────────────────────────

  describe('setIsGenerating', () => {
    it('sets isGenerating flag', () => {
      const { setIsGenerating } = useAppStore.getState();
      setIsGenerating(true);
      expect(useAppStore.getState().isGenerating).toBe(true);
      setIsGenerating(false);
      expect(useAppStore.getState().isGenerating).toBe(false);
    });
  });

  // ── Preset models ──────────────────────────────────────────────────────────

  it('initialises with preset models', () => {
    const { models } = useAppStore.getState();
    expect(models).toHaveLength(PRESET_MODELS.length);
    models.forEach(m => expect(m.status).toBe('not_downloaded'));
  });
});
