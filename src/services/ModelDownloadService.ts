/**
 * ModelDownloadService – handles downloading GGUF model files.
 *
 * Uses react-native-blob-util for resume-capable downloads with progress
 * reporting and stores models in the app's Documents directory (persists
 * across launches and shows up in iOS Files app).
 */

import RNBlobUtil from 'react-native-blob-util';
import type { ModelInfo } from '../types';

const MODELS_DIR = `${RNBlobUtil.fs.dirs.DocumentDir}/models`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function ensureModelsDir(): Promise<void> {
  const exists = await RNBlobUtil.fs.isDir(MODELS_DIR);
  if (!exists) {
    await RNBlobUtil.fs.mkdir(MODELS_DIR);
  }
}

export function modelFilePath(modelId: string): string {
  return `${MODELS_DIR}/${modelId}.gguf`;
}

export async function isModelDownloaded(modelId: string): Promise<boolean> {
  try {
    const path = modelFilePath(modelId);
    return await RNBlobUtil.fs.exists(path);
  } catch {
    return false;
  }
}

export async function deleteModel(modelId: string): Promise<void> {
  const path = modelFilePath(modelId);
  const exists = await RNBlobUtil.fs.exists(path);
  if (exists) {
    await RNBlobUtil.fs.unlink(path);
  }
}

// ─── Download ─────────────────────────────────────────────────────────────────

export interface DownloadCallbacks {
  onProgress: (progress: number) => void;
  onComplete: (localPath: string) => void;
  onError: (error: Error) => void;
}

/**
 * Download a GGUF model file.
 * Returns a cancel function that can be called to abort the download.
 */
export function downloadModel(model: ModelInfo, callbacks: DownloadCallbacks): () => void {
  const { downloadUrl, id } = model;
  const destPath = modelFilePath(id);

  // cancelFn is replaced once the task is created
  let cancelFn: () => void = () => {};

  ensureModelsDir()
    .then(() => {
      const task = RNBlobUtil.config({
        path: destPath,
        fileCache: true,
        appendExt: 'gguf',
        IOSBackgroundTask: true,
        indicator: true,
        overwrite: true,
      })
        .fetch('GET', downloadUrl)
        .progress({ interval: 500 }, (received: number, total: number) => {
          const progress = total > 0 ? received / total : 0;
          callbacks.onProgress(Math.min(progress, 1));
        });

      // Now we have the real task – expose its cancel method
      cancelFn = () => task.cancel();

      task
        .then(res => {
          callbacks.onComplete(res.path());
        })
        .catch((err: Error) => {
          // Ignore errors after a deliberate cancel
          if (err?.message?.includes('cancel')) return;
          callbacks.onError(err);
        });
    })
    .catch(callbacks.onError);

  // Return a stable cancel function that always delegates to the latest cancelFn
  return () => cancelFn();
}

// ─── Disk usage ───────────────────────────────────────────────────────────────

export async function getModelsDiskUsageBytes(): Promise<number> {
  try {
    await ensureModelsDir();
    const files = await RNBlobUtil.fs.ls(MODELS_DIR);
    let total = 0;
    for (const file of files) {
      try {
        const stat = await RNBlobUtil.fs.stat(`${MODELS_DIR}/${file}`);
        total += stat.size ?? 0;
      } catch {
        // skip
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
