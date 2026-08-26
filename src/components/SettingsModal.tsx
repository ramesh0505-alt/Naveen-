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

  const handlePingFrequencyChange = (seconds: number) => {
    triggerHaptic('light');
    const updated = { ...settings, pingFrequencySeconds: seconds };
    onUpdateSettings(updated);
    saveNetworkSettings(updated);
  };

  const handleMediaDownloadChange = (
    mediaType: 'image' | 'voice',
    value: 'always' | 'wifi_only' | 'never'
  ) => {
    triggerHaptic('light');
    const updated = {
      ...settings,
      ...(mediaType === 'image'
        ? { autoDownloadImages: value }
        : { autoDownloadVoiceNotes: value }),
    };
    onUpdateSettings(updated);
    saveNetworkSettings(updated);
  };

  const handleResetDefaults = () => {
    triggerHaptic('warning');
    onUpdateSettings(DEFAULT_NETWORK_SETTINGS);
    saveNetworkSettings(DEFAULT_NETWORK_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#111111] border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-y-auto max-h-[90vh] text-zinc-200 selection:bg-white selection:text-black"
        id="low-data-settings-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Connection & Data Saver
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Manage mobile data, cellular limits & ping rate
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Network Status Banner */}
        <div
          className={`p-3.5 rounded-2xl border mb-5 flex items-center justify-between ${
            lowDataActive
              ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                lowDataActive
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {networkInfo.isCellular ? (
                <Signal className="w-5 h-5" />
              ) : (
                <Wifi className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>
                  {networkInfo.isCellular ? 'Cellular / Metered' : 'Wi-Fi / Broadband'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 font-mono uppercase rounded ${
                    lowDataActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {lowDataActive ? 'Data Saver Active' : 'Full Bandwidth'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Type: {networkInfo.effectiveType.toUpperCase()}
                {networkInfo.downlink ? ` • ~${networkInfo.downlink} Mbps` : ''}
                {networkInfo.rtt ? ` • ${networkInfo.rtt}ms RTT` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Low Data Mode Master Setting */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              Low Data Mode Policy
            </label>
            <p className="text-xs text-zinc-400 mt-1">
              Controls when bandwidth optimization and deferred media loading take effect.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'auto_cellular',
                label: 'Auto Cellular',
                desc: 'Recommended',
              },
              {
                id: 'on',
                label: 'Always On',
                desc: 'Max Savings',
              },
              {
                id: 'off',
                label: 'Disabled',
                desc: 'Always Full',
              },
            ].map((opt) => {
              const isSelected = settings.lowDataMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() =>
                    handleToggleMode(opt.id as 'off' | 'on' | 'auto_cellular')
                  }
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold">{opt.label}</span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: WebSocket Ping Keepalive Frequency */}
        <div className="space-y-3 mb-6 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-400" />
              <label className="text-xs font-bold text-white font-mono">
                WebSocket Keepalive Frequency
              </label>
            </div>
            <span className="text-[11px] font-mono text-sky-400 font-bold bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
              {lowDataActive
                ? `Active: Every ${settings.pingFrequencySeconds}s`
                : 'Active: Every 10s (High-Res)'}
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Extending the keepalive interval in Low Data Mode minimizes radio wakeups and reduces signaling packet overhead by up to 80% on mobile cellular data.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { sec: 30, label: '30s', tag: '-66% Packets' },
              { sec: 45, label: '45s', tag: '-78% (Ideal)' },
              { sec: 60, label: '60s', tag: '-83% Max Saver' },
            ].map((item) => {
              const isSelected = settings.pingFrequencySeconds === item.sec;
              return (
                <button
                  key={item.sec}
                  onClick={() => handlePingFrequencyChange(item.sec)}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-500 text-sky-200 font-bold shadow-xs'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-xs font-mono">{item.label}</div>
                  <div className="text-[9px] text-zinc-400 font-mono mt-0.5">
                    {item.tag}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Media Auto-Download Policy */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              Cellular Media Auto-Download
            </label>
          </div>

          {/* Photos / Images */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-200">Disappearing Photos</span>
              <span className="text-[10px] font-mono text-zinc-400">
                {settings.autoDownloadImages === 'wifi_only'
                  ? 'Wi-Fi Only (Tap to Load on Cell)'
                  : settings.autoDownloadImages === 'never'
                  ? 'Always Manual Tap'
                  : 'Always Auto-Download'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { val: 'wifi_only', label: 'Wi-Fi Only' },
                  { val: 'never', label: 'Manual Tap' },
                  { val: 'always', label: 'Always Auto' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => handleMediaDownloadChange('image', opt.val)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    settings.autoDownloadImages === opt.val
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Notes / Audio */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-200">Voice Notes (Audio)</span>
              <span className="text-[10px] font-mono text-zinc-400">
                {settings.autoDownloadVoiceNotes === 'wifi_only'
                  ? 'Wi-Fi Only (Tap to Play on Cell)'
                  : settings.autoDownloadVoiceNotes === 'never'
                  ? 'Always Manual Tap'
                  : 'Always Auto-Download'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { val: 'wifi_only', label: 'Wi-Fi Only' },
                  { val: 'never', label: 'Manual Tap' },
                  { val: 'always', label: 'Always Auto' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => handleMediaDownloadChange('voice', opt.val)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    settings.autoDownloadVoiceNotes === opt.val
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            onClick={handleResetDefaults}
            className="text-xs text-zinc-400 hover:text-zinc-200 font-mono transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
