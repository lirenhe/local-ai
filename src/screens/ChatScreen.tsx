import React, { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import ChatInput from '../components/ChatInput';
import MessageBubble from '../components/MessageBubble';
import { generateResponse, isModelLoaded, loadModel } from '../services/LlamaService';
import { searchWeb, formatSearchContext } from '../services/SearchService';
import { chatCompletionStream, type ChatMessage } from '../services/ExternalLLMService';
import { selectActiveConversation, selectSelectedModel, useAppStore } from '../store/useAppStore';
import type { Message, RootStackParamList } from '../types';
import { COLORS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

/** Max number of past messages sent as context to the LLM. */
const MAX_CONTEXT_MESSAGES = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uniqueId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const conversation = useAppStore(selectActiveConversation);
  const selectedModel = useAppStore(selectSelectedModel);
  const settings = useAppStore(s => s.settings);
  const isGenerating = useAppStore(s => s.isGenerating);
  const {
    createConversation,
    addMessage,
    updateLastMessage,
    clearConversation,
    setIsGenerating,
    activeConversationId,
  } = useAppStore();

  const abortControllerRef = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Ensure there is always an active conversation
  useEffect(() => {
    if (!activeConversationId) {
      createConversation();
    }
  }, [activeConversationId, createConversation]);

  // Auto-load selected model when screen mounts (if not already loaded)
  useEffect(() => {
    if (
      settings.backend === 'local' &&
      selectedModel?.localPath &&
      selectedModel.status === 'ready' &&
      !isModelLoaded()
    ) {
      loadModel(selectedModel.localPath, {
        contextLength: selectedModel.contextLength,
        useGpu: true,
      }).catch(err => {
        Alert.alert('Model Load Error', String(err));
      });
    }
  }, [selectedModel, settings.backend]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  // ─── Send handler ─────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text: string) => {
      if (!conversation) return;
      const convId = conversation.id;

      // 1. Add user message
      const userMsg: Message = {
        id: uniqueId(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      addMessage(convId, userMsg);
      scrollToBottom();

      // 2. Placeholder assistant message (streaming)
      const assistantMsgId = uniqueId();
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        source: settings.backend === 'local' ? 'local' : 'external',
      };
      addMessage(convId, assistantMsg);
      scrollToBottom();

      setIsGenerating(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // 3. Optional web search
        let searchContext = '';
        let searchResults = undefined;
        if (settings.searchEnabled) {
          try {
            const results = await searchWeb(text, 5);
            if (results.length > 0) {
              searchResults = results;
              searchContext = formatSearchContext(results);
            }
          } catch {
            // Search failed – continue without results
          }
        }

        // 4. Build history for context
        const history = conversation.messages
          .filter(m => m.role !== 'system')
          .slice(-MAX_CONTEXT_MESSAGES) // last MAX_CONTEXT_MESSAGES for context
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        // 5. Generate response
        let accumulated = '';

        if (settings.backend === 'local') {
          // ── On-device inference ──
          if (!isModelLoaded()) {
            if (!selectedModel?.localPath) {
              updateLastMessage(convId, {
                content:
                  'No model loaded. Please go to the Models tab and download then load a model.',
                isStreaming: false,
              });
              return;
            }
            await loadModel(selectedModel.localPath, {
              contextLength: selectedModel.contextLength,
              useGpu: true,
            });
          }

          const prompt = searchContext
            ? `${searchContext}\n\nUser question: ${text}`
            : text;

          accumulated = await generateResponse(
            prompt,
            token => {
              accumulated += token;
              updateLastMessage(convId, { content: accumulated });
              scrollToBottom();
            },
            controller.signal,
            {
              maxTokens: settings.maxTokens,
              temperature: settings.temperature,
              systemPrompt: selectedModel?.systemPrompt ?? settings.systemPrompt,
              history,
            },
          );
        } else {
          // ── External LLM ──
          const messages: ChatMessage[] = [];
          if (settings.systemPrompt) {
            messages.push({ role: 'system', content: settings.systemPrompt });
          }
          if (searchContext) {
            messages.push({ role: 'system', content: searchContext });
          }
          for (const h of history) {
            messages.push(h);
          }
          messages.push({ role: 'user', content: text });

          accumulated = await chatCompletionStream(
            messages,
            settings.externalLLM,
            token => {
              accumulated += token;
              updateLastMessage(convId, { content: accumulated });
              scrollToBottom();
            },
            controller.signal,
            {
              maxTokens: settings.maxTokens,
              temperature: settings.temperature,
            },
          );
        }

        // 6. Finalise message
        updateLastMessage(convId, {
          content: accumulated,
          isStreaming: false,
          searchResults,
        });
      } catch (err: unknown) {
        const isCancelled =
          err instanceof Error && (err.name === 'AbortError' || err.message.includes('cancel'));
        updateLastMessage(convId, {
          content: isCancelled ? '(Generation stopped)' : `Error: ${String(err)}`,
          isStreaming: false,
        });
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
        scrollToBottom();
      }
    },
    [
      conversation,
      addMessage,
      updateLastMessage,
      setIsGenerating,
      settings,
      selectedModel,
      scrollToBottom,
    ],
  );

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleNewChat = useCallback(() => {
    createConversation();
  }, [createConversation]);

  const handleClear = useCallback(() => {
    if (!conversation) return;
    Alert.alert('Clear chat?', 'This will remove all messages in this conversation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => clearConversation(conversation.id),
      },
    ]);
  }, [conversation, clearConversation]);

  const messages = conversation?.messages ?? [];

  // ─── Backend status bar ───────────────────────────────────────────────────

  const noModel =
    settings.backend === 'local' &&
    (!selectedModel || selectedModel.status === 'not_downloaded');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + 44}>
      {/* Status strip */}
      {noModel && (
        <TouchableOpacity
          style={styles.noModelBanner}
          onPress={() => navigation.navigate('Models')}>
          <Text style={styles.noModelBannerText}>
            ⚠ No model loaded — tap here to download one
          </Text>
        </TouchableOpacity>
      )}

      {/* Message list */}
      {messages.length === 0 ? (
        <EmptyState backend={settings.backend} onGoToModels={() => navigation.navigate('Models')} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isGenerating={isGenerating}
        disabled={noModel && settings.backend === 'local'}
        placeholder={
          noModel
            ? 'Download a model first…'
            : settings.backend === 'external'
              ? 'Message (via Cloud)…'
              : 'Message Local AI…'
        }
      />
    </KeyboardAvoidingView>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  backend,
  onGoToModels,
}: {
  backend: string;
  onGoToModels: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateEmoji}>🤖</Text>
      <Text style={styles.emptyStateTitle}>Local AI</Text>
      <Text style={styles.emptyStateSubtitle}>
        {backend === 'local'
          ? 'Offline-first AI chat — your data never leaves your device.'
          : 'Cloud LLM mode — responses via your configured API.'}
      </Text>
      {backend === 'local' && (
        <TouchableOpacity style={styles.emptyStateCta} onPress={onGoToModels}>
          <Text style={styles.emptyStateCtaText}>Get started — download a model →</Text>
        </TouchableOpacity>
      )}
      <View style={styles.suggestions}>
        {SUGGESTIONS.map(s => (
          <Text key={s} style={styles.suggestion}>
            {s}
          </Text>
        ))}
      </View>
    </View>
  );
}

const SUGGESTIONS = [
  '"Explain quantum computing in simple terms"',
  '"Write a Python function to sort a list"',
  '"Summarise the key events of WW2"',
  '"What are some healthy breakfast ideas?"',
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  messageList: { paddingVertical: 12 },

  noModelBanner: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  noModelBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateEmoji: { fontSize: 56, marginBottom: 12 },
  emptyStateTitle: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyStateSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateCta: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 32,
  },
  emptyStateCtaText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  suggestions: { gap: 8 },
  suggestion: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
