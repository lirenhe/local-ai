import React, { memo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Message, SearchResult } from '../types';
import { COLORS } from '../utils/theme';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {/* Avatar */}
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {/* Source badge */}
        {message.source && message.source !== 'local' && (
          <SourceBadge source={message.source} />
        )}

        {/* Message text */}
        {message.content.length > 0 ? (
          <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAssistant]}>
            {message.content}
          </Text>
        ) : isStreaming ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : null}

        {/* Streaming cursor */}
        {isStreaming && message.content.length > 0 && (
          <Text style={styles.cursor}>▊</Text>
        )}

        {/* Search results */}
        {message.searchResults && message.searchResults.length > 0 && (
          <SearchResultsPanel results={message.searchResults} />
        )}

        {/* Timestamp */}
        <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAssistant]}>
          {formatTime(message.timestamp)}
          {message.source === 'external' && '  ·  Cloud'}
          {message.source === 'local' && '  ·  On-device'}
        </Text>
      </View>

      {isUser && (
        <View style={[styles.avatar, styles.avatarUser]}>
          <Text style={styles.avatarText}>You</Text>
        </View>
      )}
    </View>
  );
});

MessageBubble.displayName = 'MessageBubble';
export default MessageBubble;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const label = source === 'external' ? '☁ Cloud' : '🌐 Web';
  return (
    <View style={styles.sourceBadge}>
      <Text style={styles.sourceBadgeText}>{label}</Text>
    </View>
  );
}

function SearchResultsPanel({ results }: { results: SearchResult[] }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View style={styles.searchPanel}>
      <TouchableOpacity onPress={() => setExpanded(v => !v)} style={styles.searchToggle}>
        <Text style={styles.searchToggleText}>
          {expanded ? '▼' : '▶'} {results.length} web source{results.length !== 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>
      {expanded &&
        results.map((r, i) => (
          <View key={i} style={styles.searchResult}>
            <Text style={styles.searchResultTitle} numberOfLines={1}>{r.title}</Text>
            <Text style={styles.searchResultSnippet} numberOfLines={2}>{r.snippet}</Text>
            <Text style={styles.searchResultUrl} numberOfLines={1}>{r.url}</Text>
          </View>
        ))}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 12,
    marginVertical: 4,
  },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    flexShrink: 0,
  },
  avatarUser: { backgroundColor: COLORS.userBubble },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.assistantBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextUser: { color: '#fff' },
  messageTextAssistant: { color: COLORS.text },

  cursor: { color: COLORS.primary, fontSize: 15 },

  timestamp: { fontSize: 10, marginTop: 4 },
  timestampUser: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  timestampAssistant: { color: COLORS.textSecondary },

  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  sourceBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },

  searchPanel: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  searchToggle: { paddingVertical: 2 },
  searchToggleText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  searchResult: {
    marginTop: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  searchResultTitle: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  searchResultSnippet: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  searchResultUrl: { fontSize: 10, color: COLORS.primary, marginTop: 1 },
});
