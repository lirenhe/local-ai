import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { testConnection, listModels } from '../services/ExternalLLMService';
import { COLORS } from '../utils/theme';

export default function SettingsScreen() {
  const settings = useAppStore(s => s.settings);
  const { updateSettings } = useAppStore();

  const [testingConnection, setTestingConnection] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const result = await testConnection(settings.externalLLM);
    setTestingConnection(false);
    if (result.ok) {
      Alert.alert('✅ Connection OK', 'Successfully connected to the external LLM API.');
    } else {
      Alert.alert('❌ Connection Failed', result.error ?? 'Unknown error');
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    const models = await listModels(settings.externalLLM);
    setFetchingModels(false);
    if (models.length > 0) {
      setAvailableModels(models);
    } else {
      Alert.alert('No models found', 'Could not retrieve model list from the API.');
    }
  };

  const handleSelectModel = (modelId: string) => {
    updateSettings({ externalLLM: { ...settings.externalLLM, model: modelId } });
    setAvailableModels([]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* ── Backend selection ── */}
      <SectionHeader title="Inference Backend" />
      <View style={styles.card}>
        <SegmentedControl
          options={[
            { label: '🔒 On-Device (Offline)', value: 'local' },
            { label: '☁ Cloud LLM', value: 'external' },
          ]}
          value={settings.backend}
          onChange={v => updateSettings({ backend: v as 'local' | 'external' })}
        />
        <Text style={styles.helperText}>
          {settings.backend === 'local'
            ? 'Runs entirely on your device. Zero API cost. Requires a downloaded model.'
            : 'Connects to an OpenAI-compatible API (OpenAI, Ollama, LM Studio, etc.).'}
        </Text>
      </View>

      {/* ── Generation settings ── */}
      <SectionHeader title="Generation" />
      <View style={styles.card}>
        <SettingRow
          label="Max Tokens"
          sublabel="Maximum tokens to generate per response"
          value={String(settings.maxTokens)}
          onChangeText={v => {
            const n = parseInt(v, 10);
            if (!isNaN(n) && n > 0) updateSettings({ maxTokens: n });
          }}
          keyboardType="number-pad"
        />
        <Divider />
        <SettingRow
          label="Temperature"
          sublabel="Creativity (0 = deterministic, 1 = creative)"
          value={String(settings.temperature)}
          onChangeText={v => {
            const n = parseFloat(v);
            if (!isNaN(n) && n >= 0 && n <= 2) updateSettings({ temperature: n });
          }}
          keyboardType="decimal-pad"
        />
        <Divider />
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>System Prompt</Text>
          <Text style={styles.settingSubLabel}>Injected at the start of every conversation</Text>
          <TextInput
            style={styles.textArea}
            value={settings.systemPrompt}
            onChangeText={v => updateSettings({ systemPrompt: v })}
            multiline
            numberOfLines={4}
            placeholder="You are a helpful AI assistant…"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
      </View>

      {/* ── Internet Search ── */}
      <SectionHeader title="Internet Search" />
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.settingLabel}>Enable Web Search</Text>
            <Text style={styles.settingSubLabel}>
              Augments answers with DuckDuckGo search results (no API key required)
            </Text>
          </View>
          <Switch
            value={settings.searchEnabled}
            onValueChange={v => updateSettings({ searchEnabled: v })}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            ios_backgroundColor={COLORS.border}
          />
        </View>
      </View>

      {/* ── External LLM config ── */}
      <SectionHeader title="External LLM" />
      <View style={styles.card}>
        <SettingRow
          label="API Base URL"
          sublabel="e.g. https://api.openai.com/v1"
          value={settings.externalLLM.baseUrl}
          onChangeText={v =>
            updateSettings({ externalLLM: { ...settings.externalLLM, baseUrl: v } })
          }
          autoCapitalize="none"
          keyboardType="url"
        />
        <Divider />
        <SettingRow
          label="API Key"
          sublabel="Leave empty for Ollama / local servers"
          value={settings.externalLLM.apiKey}
          onChangeText={v =>
            updateSettings({ externalLLM: { ...settings.externalLLM, apiKey: v } })
          }
          secureTextEntry
          autoCapitalize="none"
        />
        <Divider />
        <SettingRow
          label="Model ID"
          sublabel="e.g. gpt-3.5-turbo, mistral, llama3"
          value={settings.externalLLM.model}
          onChangeText={v =>
            updateSettings({ externalLLM: { ...settings.externalLLM, model: v } })
          }
          autoCapitalize="none"
        />

        {/* Available models list */}
        {availableModels.length > 0 && (
          <View style={styles.modelPickerList}>
            <Text style={styles.modelPickerTitle}>Select a model:</Text>
            {availableModels.map(m => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.modelPickerItem,
                  m === settings.externalLLM.model && styles.modelPickerItemSelected,
                ]}
                onPress={() => handleSelectModel(m)}>
                <Text
                  style={[
                    styles.modelPickerItemText,
                    m === settings.externalLLM.model && styles.modelPickerItemTextSelected,
                  ]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Divider />

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <ActionButton
            label="Test Connection"
            onPress={handleTestConnection}
            loading={testingConnection}
          />
          <ActionButton
            label="Fetch Models"
            onPress={handleFetchModels}
            loading={fetchingModels}
            variant="secondary"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Local AI v1.0.0 · All on-device inference is completely private.
          {'\n'}Your conversations are stored only on your device.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingRow({
  label,
  sublabel,
  value,
  onChangeText,
  ...inputProps
}: {
  label: string;
  sublabel?: string;
  value: string;
  onChangeText: (v: string) => void;
  [key: string]: unknown;
}) {
  return (
    <View style={styles.settingGroup}>
      <Text style={styles.settingLabel}>{label}</Text>
      {sublabel && <Text style={styles.settingSubLabel}>{sublabel}</Text>}
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={COLORS.textSecondary}
        {...inputProps}
      />
    </View>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.segmentedOption, opt.value === value && styles.segmentedOptionSelected]}
          onPress={() => onChange(opt.value)}>
          <Text
            style={[
              styles.segmentedOptionText,
              opt.value === value && styles.segmentedOptionTextSelected,
            ]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        variant === 'secondary' ? styles.actionBtnSecondary : styles.actionBtnPrimary,
      ]}
      onPress={onPress}
      disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'secondary' ? COLORS.primary : '#fff'} />
      ) : (
        <Text
          style={[
            styles.actionBtnText,
            variant === 'secondary' ? styles.actionBtnTextSecondary : styles.actionBtnTextPrimary,
          ]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingVertical: 8, paddingBottom: 40 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  helperText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, lineHeight: 17 },

  settingGroup: { marginBottom: 4 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  settingSubLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },

  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { flex: 1, marginRight: 12 },

  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentedOptionSelected: { backgroundColor: COLORS.surface, shadowOpacity: 0.1 },
  segmentedOptionText: { fontSize: 13, color: COLORS.textSecondary },
  segmentedOptionTextSelected: { color: COLORS.text, fontWeight: '700' },

  modelPickerList: { marginTop: 12 },
  modelPickerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  modelPickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: COLORS.background,
  },
  modelPickerItemSelected: { backgroundColor: COLORS.primaryLight },
  modelPickerItemText: { fontSize: 13, color: COLORS.text },
  modelPickerItemTextSelected: { color: COLORS.primary, fontWeight: '600' },

  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  actionBtnPrimary: { backgroundColor: COLORS.primary },
  actionBtnSecondary: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  actionBtnTextPrimary: { color: '#fff' },
  actionBtnTextSecondary: { color: COLORS.primary },

  footer: { paddingHorizontal: 20, paddingTop: 24 },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
