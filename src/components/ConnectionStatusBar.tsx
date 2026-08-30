import React, { useState } from 'react';
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
      barColor: 'bg-[#ffb3af]',
      glowColor: 'shadow-[0_1px_8px_rgba(255,179,175,0.3)]',
      textColor: 'text-[#ffb3af]',
      bgColor: 'bg-[#111318]/90 border-white/5',
      dotColor: 'bg-[#ffb3af]',
      label: 'Signaling Live',
      description: 'End-to-end encrypted signaling channel',
    },
    connecting: {
      barColor: 'bg-[#ffb3af]',
      glowColor: 'shadow-[0_1px_8px_rgba(255,179,175,0.3)]',
      textColor: 'text-[#ffb3af]',
      bgColor: 'bg-[#111318]/90 border-white/5',
      dotColor: 'bg-[#ffb3af] animate-ping',
      label: 'Connecting...',
      description: 'Establishing signaling session',
    },
    reconnecting: {
      barColor: 'bg-[#ffb4ab]',
      glowColor: 'shadow-[0_1px_10px_rgba(255,180,171,0.5)]',
      textColor: 'text-[#ffb4ab]',
      bgColor: 'bg-[#111318]/90 border-[#ffb4ab]/40',
      dotColor: 'bg-[#ffb4ab] animate-pulse',
      label: 'Reconnecting',
      description: 'Connection lost, retrying automatically...',
    },
    disconnected: {
      barColor: 'bg-[#ffb4ab]',
      glowColor: 'shadow-[0_1px_10px_rgba(255,180,171,0.6)]',
      textColor: 'text-[#ffb4ab]',
      bgColor: 'bg-[#111318]/90 border-[#ffb4ab]/40',
      dotColor: 'bg-[#ffb4ab]',
      label: 'Signaling Offline',
      description: 'Unable to reach signaling server',
    },
  }[status];

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
        className={`h-[2px] w-full transition-all duration-500 ${config.barColor} ${config.glowColor} ${
          status === 'reconnecting' || status === 'connecting' ? 'animate-pulse' : ''
        }`}
      />

      {/* Prominent Banner when Disconnected or Reconnecting */}
      {isProblematic && (
        <div className="w-full bg-[#111318]/95 border-b border-[#ffb4ab]/30 text-[#e2e2e9] px-4 py-2 shadow-lg flex items-center justify-between backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffb4ab] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffb4ab]"></span>
            </span>
            <span className="font-semibold text-[#ffb4ab] font-mono">
              {config.label}:
            </span>
            <span className="text-[#c7c6cb] font-body-md text-xs hidden sm:inline">
              {config.description}
            </span>
          </div>

          {onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              className="px-3 py-1 rounded-full bg-[#ba1a1a] text-white font-label-md text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
