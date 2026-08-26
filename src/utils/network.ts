/**
 * Network diagnostic & Low Data Mode utilities
 */

export interface NetworkSettings {
  lowDataMode: 'off' | 'on' | 'auto_cellular';
  pingFrequencySeconds: number; // 10, 30, 45, 60
  autoDownloadImages: 'always' | 'wifi_only' | 'never';
  autoDownloadVoiceNotes: 'always' | 'wifi_only' | 'never';
}

export const DEFAULT_NETWORK_SETTINGS: NetworkSettings = {
  lowDataMode: 'auto_cellular',
  pingFrequencySeconds: 45,
  autoDownloadImages: 'wifi_only',
  autoDownloadVoiceNotes: 'wifi_only',
};

const STORAGE_KEY = 'private2p_network_settings_v1';

export function loadNetworkSettings(): NetworkSettings {
  if (typeof window === 'undefined') return DEFAULT_NETWORK_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_NETWORK_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load network settings:', e);
  }
  return DEFAULT_NETWORK_SETTINGS;
}

export function saveNetworkSettings(settings: NetworkSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save network settings:', e);
  }
}

export interface NetworkConnectionInfo {
  type: string;
  effectiveType: string;
  saveData: boolean;
  isCellular: boolean;
  downlink?: number;
  rtt?: number;
}

export function getNetworkInfo(): NetworkConnectionInfo {
  if (typeof window === 'undefined') {
    return {
      type: 'unknown',
      effectiveType: '4g',
      saveData: false,
      isCellular: false,
    };
  }

  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  const type = conn?.type || 'unknown';
  const effectiveType = conn?.effectiveType || '4g';
  const saveData = Boolean(conn?.saveData);
  const isCellular =
    type === 'cellular' ||
    ['3g', '2g', 'slow-2g'].includes(effectiveType) ||
    saveData;

  return {
    type,
    effectiveType,
    saveData,
    isCellular,
    downlink: conn?.downlink,
    rtt: conn?.rtt,
  };
}

export function isLowDataActive(settings: NetworkSettings): boolean {
  if (settings.lowDataMode === 'on') return true;
  if (settings.lowDataMode === 'off') return false;

  // 'auto_cellular' mode: check active connection info
  const info = getNetworkInfo();
  return info.isCellular || info.saveData;
}

export function shouldDeferMediaDownload(
  mediaType: 'image' | 'voice',
  settings: NetworkSettings
): boolean {
  const rule =
    mediaType === 'image'
      ? settings.autoDownloadImages
      : settings.autoDownloadVoiceNotes;

  if (rule === 'never') return true;
  if (rule === 'always') return false;

  // 'wifi_only' mode: defer if low data active or cellular detected
  const info = getNetworkInfo();
  return info.isCellular || info.saveData || isLowDataActive(settings);
}

export function getEffectivePingIntervalMs(settings: NetworkSettings): number {
  if (isLowDataActive(settings)) {
    return Math.max(15, settings.pingFrequencySeconds) * 1000;
  }
  return 10000; // 10 seconds normal high-frequency ping
}

export function onNetworkChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback();
  const handleOffline = () => callback();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn && typeof conn.addEventListener === 'function') {
    conn.addEventListener('change', callback);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (conn && typeof conn.removeEventListener === 'function') {
      conn.removeEventListener('change', callback);
    }
  };
}
