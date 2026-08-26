import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SignalingStatus } from '../types';

interface ConnectionStatusBarProps {
  status: SignalingStatus;
  latency?: number | null;
  lowDataActive?: boolean;
  pingIntervalSeconds?: number;
  onReconnect?: () => void;
  onOpenSettings?: () => void;
}

export const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({
  status,
  latency,
  lowDataActive = false,
  pingIntervalSeconds = 10,
  onReconnect,
  onOpenSettings,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Configuration for each state
  const config = {
    connected: {
      barColor: 'bg-emerald-500',
      glowColor: 'shadow-[0_1px_8px_rgba(16,185,129,0.4)]',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-950/80 border-emerald-800/60',
      dotColor: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
      label: 'Signaling Online',
      description: 'Encrypted signaling channel connected',
      icon: Wifi,
    },
    connecting: {
      barColor: 'bg-amber-400',
      glowColor: 'shadow-[0_1px_8px_rgba(251,191,36,0.4)]',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-950/80 border-amber-800/60',
      dotColor: 'bg-amber-400 animate-ping',
      label: 'Connecting...',
      description: 'Establishing signaling session',
      icon: RefreshCw,
    },
    reconnecting: {
      barColor: 'bg-rose-500',
      glowColor: 'shadow-[0_1px_10px_rgba(244,63,94,0.6)]',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-950/90 border-rose-800/70',
      dotColor: 'bg-rose-500 animate-pulse',
      label: 'Reconnecting to Server',
      description: 'Connection lost, retrying automatically...',
      icon: RefreshCw,
    },
    disconnected: {
      barColor: 'bg-red-600',
      glowColor: 'shadow-[0_1px_10px_rgba(220,38,38,0.7)]',
      textColor: 'text-red-400',
      bgColor: 'bg-red-950/90 border-red-800/70',
      dotColor: 'bg-red-600',
      label: 'Signaling Offline',
      description: 'Unable to reach signaling server',
      icon: WifiOff,
    },
  }[status];

  const IconComponent = config.icon;
  const isProblematic = status === 'reconnecting' || status === 'disconnected';

  return (
    <div
      id="signaling-connection-status-bar"
      className="fixed top-0 left-0 right-0 z-50 select-none transition-all duration-300 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Color-Coded Ambient Bar */}
      <div
        className={`h-[2.5px] w-full transition-all duration-500 ${config.barColor} ${config.glowColor} ${
          status === 'reconnecting' || status === 'connecting' ? 'animate-pulse' : ''
        }`}
      />

      {/* Prominent Banner when Disconnected or Reconnecting */}
      {isProblematic && (
        <div className="w-full bg-rose-950/95 dark:bg-zinc-950/95 border-b border-rose-500/40 text-white px-4 py-1.5 shadow-md flex items-center justify-between backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="font-semibold text-rose-300 font-mono">
              {config.label}:
            </span>
            <span className="text-zinc-300 text-[11px] hidden sm:inline">
              {config.description}
            </span>
          </div>

          {onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              className="px-2.5 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Retry Now</span>
            </button>
          )}
        </div>
      )}

      {/* Subtle floating pill at the top-right corner (compact, visible on hover or state change) */}
      {!isProblematic && (
        <div
          className={`absolute top-1.5 right-3 sm:right-6 transition-all duration-300 pointer-events-auto ${
            isHovered
              ? 'opacity-100 translate-y-0'
              : 'opacity-40 sm:opacity-60 hover:opacity-100 translate-y-0'
          }`}
        >
          <button
            type="button"
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono backdrop-blur-md transition-all shadow-xs cursor-pointer active:scale-95 ${config.bgColor} ${config.textColor}`}
            title={`${config.label} - ${config.description}${
              latency ? ` (${latency}ms ping)` : ''
            }${lowDataActive ? ` • Low Data Saver (${pingIntervalSeconds}s ping)` : ''} - Click for Data Settings`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
            <span className="font-semibold tracking-wide uppercase">
              {status === 'connected' ? 'Signal Live' : config.label}
            </span>
            {lowDataActive && (
              <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 py-0.2 rounded border border-amber-500/40">
                Low Data ({pingIntervalSeconds}s)
              </span>
            )}
            {status === 'connected' && latency !== null && latency !== undefined && (
              <span className="text-[9px] text-zinc-400 border-l border-zinc-700/60 pl-1.5">
                {latency}ms
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
