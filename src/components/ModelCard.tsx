import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ModelInfo } from '../types';
import { COLORS } from '../utils/theme';
import { formatBytes } from '../services/ModelDownloadService';

interface ModelCardProps {
  model: ModelInfo;
  isSelected: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onLoad: () => void;
}

export default function ModelCard({
  model,
  isSelected,
  onDownload,
  onDelete,
  onSelect,
  onLoad,
}: ModelCardProps) {
  const { name, description, sizeLabel, contextLength, status, downloadProgress } = model;

  const progressPercent =
    downloadProgress != null ? Math.round(downloadProgress * 100) : 0;

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{name}</Text>
          {isSelected && <View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>Active</Text></View>}
        </View>
        <StatusBadge status={status} />
      </View>

      <Text style={styles.description}>{description}</Text>

      <View style={styles.meta}>
        <MetaChip icon="💾" label={sizeLabel} />
        <MetaChip icon="📝" label={`${(contextLength / 1024).toFixed(0)}K ctx`} />
        <MetaChip icon="🔒" label="Offline" />
      </View>

      {/* Download progress bar */}
      {status === 'downloading' && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          <Text style={styles.progressText}>{progressPercent}%</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {status === 'not_downloaded' && (
          <ActionButton label="Download" onPress={onDownload} variant="primary" />
        )}
        {status === 'downloading' && (
          <ActionButton label="Cancel" onPress={onDelete} variant="danger" loading />
        )}
        {status === 'ready' && (
          <>
            <ActionButton label="Load" onPress={onLoad} variant="primary" />
            <ActionButton label="Select" onPress={onSelect} variant="secondary" />
            <ActionButton label="Delete" onPress={onDelete} variant="danger" />
          </>
        )}
        {status === 'loading' && (
          <ActionButton label="Loading…" onPress={() => {}} variant="secondary" loading />
        )}
        {status === 'loaded' && (
          <>
            {!isSelected && <ActionButton label="Use this" onPress={onSelect} variant="primary" />}
            <ActionButton label="Delete" onPress={onDelete} variant="danger" />
          </>
        )}
        {status === 'error' && (
          <>
            <ActionButton label="Retry" onPress={onDownload} variant="primary" />
            <ActionButton label="Delete" onPress={onDelete} variant="danger" />
          </>
        )}
      </View>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ModelInfo['status'] }) {
  const map: Record<ModelInfo['status'], { label: string; color: string }> = {
    not_downloaded: { label: 'Not downloaded', color: COLORS.textSecondary },
    downloading: { label: 'Downloading…', color: COLORS.warning },
    ready: { label: 'Ready', color: COLORS.success },
    loading: { label: 'Loading…', color: COLORS.warning },
    loaded: { label: 'Loaded ✓', color: COLORS.success },
    error: { label: 'Error', color: COLORS.error },
  };
  const { label, color } = map[status];
  return <Text style={[styles.statusBadge, { color }]}>{label}</Text>;
}

function MetaChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}) {
  const bg =
    variant === 'primary'
      ? COLORS.primary
      : variant === 'danger'
        ? COLORS.error
        : COLORS.surface;
  const color = variant === 'secondary' ? COLORS.text : '#fff';

  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: bg }]} onPress={onPress}>
      {loading && <ActivityIndicator size="small" color={color} style={{ marginRight: 4 }} />}
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  selectedBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectedBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
  statusBadge: { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaIcon: { fontSize: 12, marginRight: 4 },
  metaLabel: { fontSize: 12, color: COLORS.textSecondary },
  progressContainer: {
    height: 20,
    backgroundColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    position: 'absolute',
    left: 0,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
});

// re-export formatBytes for convenience
export { formatBytes };
