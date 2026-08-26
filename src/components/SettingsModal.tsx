import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Wifi,
  Signal,
  Radio,
  Download,
  Flame,
  Check,
  Shield,
  Zap,
  HardDrive,
  Info,
  Smartphone,
  Gauge,
} from 'lucide-react';
import {
  NetworkSettings,
  getNetworkInfo,
  isLowDataActive,
  saveNetworkSettings,
  DEFAULT_NETWORK_SETTINGS,
} from '../utils/network';
import { triggerHaptic } from '../utils/helpers';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NetworkSettings;
  onUpdateSettings: (newSettings: NetworkSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [networkInfo, setNetworkInfo] = useState(getNetworkInfo());
  const lowDataActive = isLowDataActive(settings);

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

  const handleToggleCallBitrate = (rate: 'adaptive' | 'low_bandwidth') => {
    triggerHaptic('light');
    const updated = { ...settings, callAudioBitrate: rate };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1326]/85 backdrop-blur-xl animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-[#131b2e] border border-white/10 shadow-2xl p-6 text-[#dae2fd] rounded-3xl animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#171f33] border border-white/10 flex items-center justify-center text-[#adc6ff]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#dae2fd]">Connection & Data</h2>
              <p className="text-xs text-[#c2c6d6] font-mono">
                Real-time optimization for low bandwidth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#171f33] hover:bg-[#222a3d] text-[#c2c6d6] hover:text-[#dae2fd] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* Real-time Network Telemetry */}
          <div className="p-4 rounded-2xl bg-[#171f33] border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#c2c6d6]">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#adc6ff]" />
                <span className="font-semibold text-[#dae2fd]">LIVE NETWORK STATUS</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  networkInfo.isOnline
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                    : 'bg-red-950/60 text-red-400 border border-red-800/60'
                }`}
              >
                {networkInfo.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-center">
              <div className="p-2 rounded-xl bg-[#222a3d]/60">
                <div className="text-[10px] text-[#8c909f]">TYPE</div>
                <div className="text-xs font-bold text-[#dae2fd] uppercase">
                  {networkInfo.connectionType}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#222a3d]/60">
                <div className="text-[10px] text-[#8c909f]">SPEED</div>
                <div className="text-xs font-bold text-[#dae2fd] uppercase">
                  {networkInfo.effectiveType.toUpperCase()}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#222a3d]/60">
                <div className="text-[10px] text-[#8c909f]">DOWNLINK</div>
                <div className="text-xs font-bold text-[#dae2fd]">
                  {networkInfo.downlink ? `${networkInfo.downlink} Mbps` : 'N/A'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#222a3d]/60">
                <div className="text-[10px] text-[#8c909f]">LATENCY</div>
                <div className="text-xs font-bold text-[#dae2fd]">
                  {networkInfo.rtt ? `${networkInfo.rtt} ms` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Low Data Mode Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-[#dae2fd]">Low Data Mode</span>
                <p className="text-xs text-[#c2c6d6]">
                  Reduces bandwidth on weak connections & mobile data
                </p>
              </div>
              {lowDataActive && (
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#df7412]/20 border border-[#df7412]/40 text-[#ffb786]">
                  Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleToggleMode('off')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  settings.lowDataMode === 'off'
                    ? 'border-[#adc6ff] bg-[#171f33] text-white shadow-sm'
                    : 'border-white/5 bg-[#0b1326] text-[#8c909f] hover:bg-[#171f33]'
                }`}
              >
                <div className="font-semibold text-xs text-[#dae2fd]">Off</div>
                <div className="text-[10px] text-[#8c909f] mt-0.5">High Fidelity</div>
              </button>

              <button
                type="button"
                onClick={() => handleToggleMode('auto_cellular')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  settings.lowDataMode === 'auto_cellular'
                    ? 'border-[#adc6ff] bg-[#171f33] text-white shadow-sm'
                    : 'border-white/5 bg-[#0b1326] text-[#8c909f] hover:bg-[#171f33]'
                }`}
              >
                <div className="font-semibold text-xs text-[#dae2fd]">Auto</div>
                <div className="text-[10px] text-[#8c909f] mt-0.5">On Cellular</div>
              </button>

              <button
                type="button"
                onClick={() => handleToggleMode('on')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  settings.lowDataMode === 'on'
                    ? 'border-[#ffb786] bg-[#171f33] text-[#ffb786] shadow-sm'
                    : 'border-white/5 bg-[#0b1326] text-[#8c909f] hover:bg-[#171f33]'
                }`}
              >
                <div className="font-semibold text-xs">Always On</div>
                <div className="text-[10px] text-[#8c909f] mt-0.5">Max Savings</div>
              </button>
            </div>
          </div>

          {/* Voice Notes Audio Compression */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#dae2fd]">
              Voice Notes Audio Compression
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleToggleVoiceBitrate('standard')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  settings.voiceBitrate === 'standard'
                    ? 'border-[#adc6ff] bg-[#171f33] text-white'
                    : 'border-white/5 bg-[#0b1326] text-[#8c909f] hover:bg-[#171f33]'
                }`}
              >
                <div className="font-semibold text-xs text-[#dae2fd]">Studio Opus</div>
                <div className="text-[10px] text-[#8c909f] mt-0.5">48 kbps clear audio</div>
              </button>

              <button
                type="button"
                onClick={() => handleToggleVoiceBitrate('compressed_low')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  settings.voiceBitrate === 'compressed_low'
                    ? 'border-[#adc6ff] bg-[#171f33] text-white'
                    : 'border-white/5 bg-[#0b1326] text-[#8c909f] hover:bg-[#171f33]'
                }`}
              >
                <div className="font-semibold text-xs text-[#dae2fd]">Compact Opus</div>
                <div className="text-[10px] text-[#8c909f] mt-0.5">16 kbps 70% smaller</div>
              </button>
            </div>
          </div>

          {/* Auto Download Toggles */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#dae2fd]">
              Media Auto-Download
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleToggleAutoDownload('voiceNotes')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#0b1326] border border-white/5 hover:border-white/10 transition-colors text-left cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-[#dae2fd]">
                    Auto-download Voice Notes
                  </div>
                  <div className="text-[11px] text-[#8c909f]">
                    When disabled, tap to download before playing
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center ${
                    settings.autoDownloadMedia.voiceNotes
                      ? 'bg-[#adc6ff] text-[#002e6a]'
                      : 'border border-white/20'
                  }`}
                >
                  {settings.autoDownloadMedia.voiceNotes && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#adc6ff] text-[#002e6a] text-xs font-semibold hover:bg-[#adc6ff]/90 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
