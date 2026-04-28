import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import ModelCard from '../components/ModelCard';
import {
  downloadModel,
  deleteModel,
  isModelDownloaded,
  getModelsDiskUsageBytes,
  formatBytes,
} from '../services/ModelDownloadService';
import { loadModel, unloadModel } from '../services/LlamaService';
import { useAppStore } from '../store/useAppStore';
import type { ModelInfo } from '../types';
import { COLORS } from '../utils/theme';

export default function ModelScreen() {
  const models = useAppStore(s => s.models);
  const settings = useAppStore(s => s.settings);
  const { setModelStatus, setModelDownloadProgress, updateSettings } = useAppStore();

  const [diskUsage, setDiskUsage] = useState(0);

  // Sync downloaded status on mount
  useEffect(() => {
    const { modelFilePath } = require('../services/ModelDownloadService');
    const syncModels = async () => {
      await Promise.all(
        models
          .filter(m => m.status === 'not_downloaded' || m.status === 'error')
          .map(async model => {
            const downloaded = await isModelDownloaded(model.id);
            if (downloaded) {
              const localPath = modelFilePath(model.id);
              setModelStatus(model.id, 'ready', localPath);
            }
          }),
      );
      const bytes = await getModelsDiskUsageBytes();
      setDiskUsage(bytes);
    };
    syncModels();
  }, []);

  const refreshDiskUsage = async () => {
    const bytes = await getModelsDiskUsageBytes();
    setDiskUsage(bytes);
  };

  // ── Download ──────────────────────────────────────────────────────────────

  const handleDownload = async (model: ModelInfo) => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert('No Internet', 'A network connection is required to download models.');
      return;
    }

    if (net.type === 'cellular') {
      Alert.alert(
        'Using Mobile Data',
        `Downloading "${model.name}" (${model.sizeLabel}) over cellular data. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download', onPress: () => startDownload(model) },
        ],
      );
      return;
    }

    startDownload(model);
  };

  const startDownload = (model: ModelInfo) => {
    setModelStatus(model.id, 'downloading');
    setModelDownloadProgress(model.id, 0);

    downloadModel(model, {
      onProgress: progress => {
        setModelDownloadProgress(model.id, progress);
      },
      onComplete: localPath => {
        setModelStatus(model.id, 'ready', localPath);
        refreshDiskUsage();
        Alert.alert('Download Complete', `"${model.name}" is ready to use.`);
      },
      onError: err => {
        setModelStatus(model.id, 'error');
        Alert.alert('Download Failed', String(err));
      },
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = (model: ModelInfo) => {
    Alert.alert(
      'Delete model?',
      `"${model.name}" will be removed from your device. You can re-download it any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteModel(model.id);
              setModelStatus(model.id, 'not_downloaded');
              if (settings.selectedModelId === model.id) {
                updateSettings({ selectedModelId: null });
                await unloadModel();
              }
              refreshDiskUsage();
            } catch (err) {
              Alert.alert('Error', String(err));
            }
          },
        },
      ],
    );
  };

  // ── Load ──────────────────────────────────────────────────────────────────

  const handleLoad = async (model: ModelInfo) => {
    if (!model.localPath) return;
    setModelStatus(model.id, 'loading');
    try {
      await loadModel(model.localPath, {
        contextLength: model.contextLength,
        useGpu: true,
      });
      setModelStatus(model.id, 'loaded');
      updateSettings({ selectedModelId: model.id });
      Alert.alert('Model Ready', `"${model.name}" has been loaded into memory.`);
    } catch (err) {
      setModelStatus(model.id, 'error');
      Alert.alert('Load Error', String(err));
    }
  };

  // ── Select ────────────────────────────────────────────────────────────────

  const handleSelect = (model: ModelInfo) => {
    updateSettings({ selectedModelId: model.id });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* Header info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>On-Device Language Models</Text>
        <Text style={styles.infoText}>
          Models are stored on your device and run entirely offline using Apple Silicon /
          Metal GPU acceleration. No internet required after download.
        </Text>
        {diskUsage > 0 && (
          <Text style={styles.diskUsage}>
            📦 {formatBytes(diskUsage)} used by models
          </Text>
        )}
      </View>

      {/* Model cards */}
      {models.map(model => (
        <ModelCard
          key={model.id}
          model={model}
          isSelected={settings.selectedModelId === model.id}
          onDownload={() => handleDownload(model)}
          onDelete={() => handleDelete(model)}
          onSelect={() => handleSelect(model)}
          onLoad={() => handleLoad(model)}
        />
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Models are in GGUF format and run via llama.cpp with Metal GPU on iOS.
          {'\n'}Recommended: Phi-3 Mini for best quality/size balance.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingVertical: 12, paddingBottom: 40 },

  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  diskUsage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: '600',
  },

  footer: { paddingHorizontal: 20, paddingTop: 16 },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
