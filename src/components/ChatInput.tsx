import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../utils/theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  onStop,
  isGenerating,
  disabled = false,
  placeholder = 'Message Local AI…',
}: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.clear();
  };

  const canSend = text.trim().length > 0 && !isGenerating && !disabled;

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        multiline
        maxLength={4000}
        editable={!disabled && !isGenerating}
        returnKeyType="default"
        enablesReturnKeyAutomatically={false}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />

      {isGenerating ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.stopButton]}
          onPress={onStop}
          accessibilityLabel="Stop generating">
          <View style={styles.stopIcon} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionButton, styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          accessibilityLabel="Send message">
          {isGenerating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendIcon}>↑</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendButton: { backgroundColor: COLORS.primary },
  sendButtonDisabled: { backgroundColor: COLORS.border },
  sendIcon: { fontSize: 18, color: '#fff', fontWeight: '700', marginTop: -2 },
  stopButton: { backgroundColor: '#FF3B30' },
  stopIcon: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
});
