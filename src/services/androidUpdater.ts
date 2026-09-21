import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AndroidUpdateInfo {
  currentVersion: string;
  currentCode: number;
  latestVersion: string;
  latestCode: number;
  updateAvailable: boolean;
  downloadUrl: string;
  releaseNotes: string;
}

interface AndroidUpdaterPlugin {
  checkForUpdate(options: { manifestUrl: string }): Promise<AndroidUpdateInfo>;
  downloadAndInstall(options: { downloadUrl: string; version: string }): Promise<{
    started?: boolean;
    requiresPermission?: boolean;
  }>;
}

const AndroidUpdater = registerPlugin<AndroidUpdaterPlugin>('AndroidUpdater');
const DEFAULT_MANIFEST_URL =
  'https://raw.githubusercontent.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/main/public/android-update.json';

export function isAndroidApp(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export async function checkAndroidUpdate(): Promise<AndroidUpdateInfo | null> {
  if (!isAndroidApp()) return null;
  const manifestUrl = DEFAULT_MANIFEST_URL;
  try {
    const result = await AndroidUpdater.checkForUpdate({ manifestUrl });
    return result.updateAvailable ? result : null;
  } catch (error) {
    console.warn('[AndroidUpdater] Falha ao verificar versão:', error);
    return null;
  }
}

export function installAndroidUpdate(update: AndroidUpdateInfo) {
  return AndroidUpdater.downloadAndInstall({
    downloadUrl: update.downloadUrl,
    version: update.latestVersion,
  });
}