import React, { useState, useEffect } from 'react';
import {
  NetworkSettings,
  getNetworkInfo,
  isLowDataActive,
  saveNetworkSettings,
} from '../utils/network';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  getNotificationPermissionState,
  requestNotificationPermission,
  emitInAppToast,
  subscribeUserToPush,
} from '../utils/notifications';
import { triggerHaptic } from '../utils/helpers';
import { SoundEffects } from '../utils/audio';
import type { NotificationPreferences } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NetworkSettings;
  onUpdateSettings: (newSettings: NetworkSettings) => void;
  roomCode?: string;
  sessionToken?: string;
  initialTab?: 'notifications' | 'network';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  roomCode,
  sessionToken,
  initialTab = 'notifications',
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'network'>(initialTab);
  const [networkInfo, setNetworkInfo] = useState(getNetworkInfo());
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(loadNotificationPreferences());
  const [permissionState, setPermissionState] = useState(getNotificationPermissionState());
  const lowDataActive = isLowDataActive(settings);

  useEffect(() => {
    if (isOpen) {
      setNotifPrefs(loadNotificationPreferences());
      setPermissionState(getNotificationPermissionState());
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleNetworkChange = () => {
      setNetworkInfo(getNetworkInfo());
    };

    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', handleNetworkChange);
    }
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', handleNetworkChange);
      }
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  if (!isOpen) return null;

  const handleToggleNotifPref = async (key: keyof NotificationPreferences) => {
    triggerHaptic('light');
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    saveNotificationPreferences(updated);

    if (key === 'enabled' && updated.enabled && permissionState === 'default') {
      const res = await requestNotificationPermission();
      setPermissionState(res);
      if (res === 'granted' && sessionToken && roomCode) {
        await subscribeUserToPush(sessionToken, roomCode);
      }
    }
  };

  const handleRequestPermission = async () => {
    triggerHaptic('impact');
    const res = await requestNotificationPermission();
    setPermissionState(res);
    if (res === 'granted') {
      const updated = { ...notifPrefs, enabled: true };
      setNotifPrefs(updated);
      saveNotificationPreferences(updated);
      if (sessionToken && roomCode) {
        await subscribeUserToPush(sessionToken, roomCode);
      }
    }
  };

  const handleSendTestNotification = () => {
    triggerHaptic('success');
    if (notifPrefs.sound) {
      SoundEffects.playMessageReceived();
    }
    emitInAppToast({
      id: 'test-' + Date.now(),
      type: 'MESSAGE',
      title: 'VELORA',
      body: notifPrefs.messagePreviews
        ? 'Private Space: "Hey, are you free?"'
        : 'New message from your private space',
      roomCode: roomCode || 'VELORA-DEMO',
      timestamp: Date.now(),
      read: false,
    });
  };

  const handleToggleMode = (mode: 'off' | 'on' | 'auto_cellular') => {
    triggerHaptic('medium');
    const updated = { ...settings, lowDataMode: mode };
    onUpdateSettings(updated);
    saveNetworkSettings(updated);
  };

  const handleToggleVoiceBitrate = (rate: 'standard' | 'compressed_low') => {
    triggerHaptic('light');
    const updated = { ...settings, voiceBitrate: rate };
    onUpdateSettings(updated);
    saveNetworkSettings(updated);
  };

  const handleToggleAutoDownload = (key: 'voiceNotes' | 'photos') => {
    triggerHaptic('light');
    const updated = {
      ...settings,
      autoDownloadMedia: {
        ...settings.autoDownloadMedia,
        [key]: !settings.autoDownloadMedia[key],
      },
    };
    onUpdateSettings(updated);
    saveNetworkSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#121419] border border-[#272A31] shadow-2xl p-6 text-[#F5F3EE] rounded-[28px] animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#272A31]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#181B21] border border-[#272A31] flex items-center justify-center text-[#E8D8B8]">
              <span className="material-symbols-outlined text-[18px]">
                {activeTab === 'notifications' ? 'notifications' : 'tune'}
              </span>
            </div>
            <div>
              <h2 className="font-editorial text-lg text-[#F5F3EE]">Settings</h2>
              <p className="font-body-sm text-[11px] text-[#9B9DA3]">
                Notifications and network preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#181B21] hover:bg-[#272A31] text-[#9B9DA3] hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 bg-[#181B21] rounded-2xl border border-[#272A31] mt-3.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('notifications');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-[#121419] text-[#F5F3EE] shadow-sm border border-[#272A31]'
                : 'text-[#9B9DA3] hover:text-[#F5F3EE]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">notifications</span>
            Notifications
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('network');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'network'
                ? 'bg-[#121419] text-[#F5F3EE] shadow-sm border border-[#272A31]'
                : 'text-[#9B9DA3] hover:text-[#F5F3EE]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">wifi</span>
            Network
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {activeTab === 'notifications' ? (
            <div className="space-y-4">
              {/* Permission Banner if Blocked or Default */}
              {permissionState === 'denied' ? (
                <div className="p-3.5 rounded-2xl bg-[#FF5C5C]/10 border border-[#FF5C5C]/30 text-[#F5F3EE] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#FF5C5C] font-semibold text-xs">
                    <span className="material-symbols-outlined text-[16px]">block</span>
                    Notifications Blocked
                  </div>
                  <p className="font-body-sm text-[11px] text-[#9B9DA3] leading-relaxed">
                    Notifications are blocked by your browser. Open browser site settings to enable them for VELORA.
                  </p>
                </div>
              ) : permissionState === 'default' ? (
                <div className="p-3.5 rounded-2xl bg-[#E8D8B8]/10 border border-[#E8D8B8]/30 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-[#F5F3EE]">Enable System Push</div>
                    <div className="text-[10px] text-[#9B9DA3] truncate">Receive alerts when outside chat</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md text-xs font-bold hover:bg-[#F0E3C8] transition-colors cursor-pointer flex-shrink-0"
                  >
                    Enable
                  </button>
                </div>
              ) : null}

              {/* Toggles List */}
              <div className="space-y-2">
                {/* Master Push Notifications Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#181B21] border border-[#272A31]">
                  <div>
                    <div className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                      Notifications
                    </div>
                    <div className="font-body-sm text-[10px] text-[#9B9DA3]">
                      Master switch for all alerts and toasts
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotifPref('enabled')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.enabled ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#121419] absolute top-1 transition-transform ${
                        notifPrefs.enabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Message Previews Toggle (Privacy First) */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#181B21] border border-[#272A31]">
                  <div className="pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                        Message Previews
                      </span>
                      {!notifPrefs.messagePreviews && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#7ED6A5]/15 text-[#7ED6A5] border border-[#7ED6A5]/30">
                          PRIVACY
                        </span>
                      )}
                    </div>
                    <div className="font-body-sm text-[10px] text-[#9B9DA3]">
                      {notifPrefs.messagePreviews
                        ? 'Shows sender name and message content'
                        : 'Conceals sensitive text (VELORA: New message)'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotifPref('messagePreviews')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.messagePreviews ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#121419] absolute top-1 transition-transform ${
                        notifPrefs.messagePreviews ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Voice Messages */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#181B21] border border-[#272A31]">
                  <div>
                    <div className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                      Voice Messages
                    </div>
                    <div className="font-body-sm text-[10px] text-[#9B9DA3]">
                      Alert when a new voice note arrives
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotifPref('voiceMessages')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.voiceMessages ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#121419] absolute top-1 transition-transform ${
                        notifPrefs.voiceMessages ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Audio Calls */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#181B21] border border-[#272A31]">
                  <div>
                    <div className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                      Audio Calls
                    </div>
                    <div className="font-body-sm text-[10px] text-[#9B9DA3]">
                      High-priority incoming and missed call alerts
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotifPref('audioCalls')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.audioCalls ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#121419] absolute top-1 transition-transform ${
                        notifPrefs.audioCalls ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Room Activity */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#181B21] border border-[#272A31]">
                  <div>
                    <div className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                      Room Activity
                    </div>
                    <div className="font-body-sm text-[10px] text-[#9B9DA3]">
                      Participant joins, leaves, and expiration reminders
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotifPref('roomActivity')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.roomActivity ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#121419] absolute top-1 transition-transform ${
                        notifPrefs.roomActivity ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Sound */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#181B21] border border-[#272A31]">
                  <div>
                    <div className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                      Sound
                    </div>
                    <div className="font-body-sm text-[10px] text-[#9B9DA3]">
                      Subtle synthesized chimes and ringtones
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotifPref('sound')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.sound ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#121419] absolute top-1 transition-transform ${
                        notifPrefs.sound ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Vibration */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#181B21] border border-[#272A31]">
                  <div>
                    <div className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                      Vibration / Haptics
                    </div>
                    <div className="font-body-sm text-[10px] text-[#9B9DA3]">
                      Nuanced tactile patterns on mobile devices
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotifPref('vibration')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.vibration ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#121419] absolute top-1 transition-transform ${
                        notifPrefs.vibration ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Test Notification Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="w-full py-2.5 px-4 rounded-2xl bg-[#181B21] hover:bg-[#272A31] border border-[#272A31] text-xs font-semibold text-[#E8D8B8] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  Send Test Notification
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Real-time Network Telemetry */}
              <div className="p-3.5 rounded-2xl bg-[#181B21] border border-[#272A31] space-y-2.5">
                <div className="flex items-center justify-between font-label-sm text-xs text-[#9B9DA3]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#E8D8B8] text-[16px]">wifi</span>
                    <span className="font-semibold text-[#F5F3EE] uppercase tracking-wider font-mono text-[11px]">Telemetry</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      networkInfo.isOnline
                        ? 'bg-[#7ED6A5]/15 text-[#7ED6A5] border border-[#7ED6A5]/30'
                        : 'bg-[#FF5C5C]/15 text-[#FF5C5C] border border-[#FF5C5C]/30'
                    }`}
                  >
                    {networkInfo.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 font-mono text-center">
                  <div className="p-2 rounded-xl bg-[#121419] border border-[#272A31]">
                    <div className="text-[9px] text-[#6E7179]">TYPE</div>
                    <div className="text-[11px] font-bold text-[#F5F3EE] uppercase">
                      {networkInfo.connectionType}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#121419] border border-[#272A31]">
                    <div className="text-[9px] text-[#6E7179]">SPEED</div>
                    <div className="text-[11px] font-bold text-[#F5F3EE] uppercase">
                      {networkInfo.effectiveType.toUpperCase()}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#121419] border border-[#272A31]">
                    <div className="text-[9px] text-[#6E7179]">DOWNLINK</div>
                    <div className="text-[11px] font-bold text-[#F5F3EE]">
                      {networkInfo.downlink ? `${networkInfo.downlink} Mbps` : 'N/A'}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#121419] border border-[#272A31]">
                    <div className="text-[9px] text-[#6E7179]">LATENCY</div>
                    <div className="text-[11px] font-bold text-[#F5F3EE]">
                      {networkInfo.rtt ? `${networkInfo.rtt} ms` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Low Data Mode Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-label-md text-xs font-semibold text-[#F5F3EE]">Low Data Mode</span>
                    <p className="font-body-sm text-[11px] text-[#9B9DA3]">
                      Reduces bandwidth on weak connections & mobile data
                    </p>
                  </div>
                  {lowDataActive && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#E8D8B8]/15 border border-[#E8D8B8]/30 text-[#E8D8B8]">
                      Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleMode('off')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.lowDataMode === 'off'
                        ? 'border-[#E8D8B8] bg-[#181B21] text-[#F5F3EE]'
                        : 'border-[#272A31] bg-[#121419] text-[#9B9DA3] hover:bg-[#181B21]'
                    }`}
                  >
                    <div className="font-label-md font-semibold text-xs text-[#F5F3EE]">Off</div>
                    <div className="text-[9px] text-[#9B9DA3] mt-0.5">High Fidelity</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMode('auto_cellular')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.lowDataMode === 'auto_cellular'
                        ? 'border-[#E8D8B8] bg-[#181B21] text-[#F5F3EE]'
                        : 'border-[#272A31] bg-[#121419] text-[#9B9DA3] hover:bg-[#181B21]'
                    }`}
                  >
                    <div className="font-label-md font-semibold text-xs text-[#F5F3EE]">Auto</div>
                    <div className="text-[9px] text-[#9B9DA3] mt-0.5">On Cellular</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMode('on')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.lowDataMode === 'on'
                        ? 'border-[#E8D8B8] bg-[#181B21] text-[#E8D8B8]'
                        : 'border-[#272A31] bg-[#121419] text-[#9B9DA3] hover:bg-[#181B21]'
                    }`}
                  >
                    <div className="font-label-md font-semibold text-xs text-[#F5F3EE]">Always On</div>
                    <div className="text-[9px] text-[#9B9DA3] mt-0.5">Max Savings</div>
                  </button>
                </div>
              </div>

              {/* Voice Notes Audio Compression */}
              <div className="space-y-2">
                <div className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                  Voice Notes Audio Compression
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleVoiceBitrate('standard')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.voiceBitrate === 'standard'
                        ? 'border-[#E8D8B8] bg-[#181B21] text-[#F5F3EE]'
                        : 'border-[#272A31] bg-[#121419] text-[#9B9DA3] hover:bg-[#181B21]'
                    }`}
                  >
                    <div className="font-label-md font-semibold text-xs text-[#F5F3EE]">Studio Opus</div>
                    <div className="text-[9px] text-[#9B9DA3] mt-0.5">48 kbps crisp clarity</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleVoiceBitrate('compressed_low')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.voiceBitrate === 'compressed_low'
                        ? 'border-[#E8D8B8] bg-[#181B21] text-[#F5F3EE]'
                        : 'border-[#272A31] bg-[#121419] text-[#9B9DA3] hover:bg-[#181B21]'
                    }`}
                  >
                    <div className="font-label-md font-semibold text-xs text-[#F5F3EE]">Compact Opus</div>
                    <div className="text-[9px] text-[#9B9DA3] mt-0.5">16 kbps 70% smaller</div>
                  </button>
                </div>
              </div>

              {/* Auto Download Toggles */}
              <div className="space-y-2">
                <div className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                  Media Auto-Download
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAutoDownload('voiceNotes')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-[#181B21] border border-[#272A31] hover:border-[#3C4049] transition-colors text-left cursor-pointer"
                  >
                    <div>
                      <div className="font-label-md text-xs font-semibold text-[#F5F3EE]">
                        Auto-download Voice Notes
                      </div>
                      <div className="font-body-sm text-[10px] text-[#9B9DA3]">
                        When disabled, tap to fetch before playing
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        settings.autoDownloadMedia.voiceNotes
                          ? 'bg-[#E8D8B8] text-[#121419]'
                          : 'border border-[#272A31]'
                      }`}
                    >
                      {settings.autoDownloadMedia.voiceNotes && (
                        <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#272A31] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md text-xs font-bold hover:bg-[#F0E3C8] transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

