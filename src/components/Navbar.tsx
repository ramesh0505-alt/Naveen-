import React from 'react';
import type { RoomStatus, SignalingStatus } from '../types';
import { triggerHaptic } from '../utils/helpers';

interface NavbarProps {
  currentRoomCode?: string;
  roomStatus?: RoomStatus;
  memberCount?: number;
  signalingStatus?: SignalingStatus;
  pingLatency?: number | null;
  isLowDataActive?: boolean;
  onNavigateHome: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoomCode,
  roomStatus,
  memberCount,
  signalingStatus = 'connected',
  pingLatency,
  isLowDataActive = false,
  onNavigateHome,
  onOpenProfile,
  onOpenSettings,
}) => {
  // Dot & color styling based on signaling status
  const statusConfig = {
    connected: {
      dotColor: 'bg-[#7ED6A5]',
      textColor: 'text-[#9B9DA3] group-hover:text-[#F5F3EE]',
      label: 'Secure Online',
      borderColor: 'border-[#272A31] hover:border-[#E8D8B8]/40',
      bgColor: 'bg-[#181B21]',
    },
    connecting: {
      dotColor: 'bg-[#E8D8B8] animate-ping',
      textColor: 'text-[#E8D8B8]',
      label: 'Connecting...',
      borderColor: 'border-[#E8D8B8]/40',
      bgColor: 'bg-[#181B21]',
    },
    reconnecting: {
      dotColor: 'bg-[#FF5C5C] animate-pulse',
      textColor: 'text-[#FF5C5C]',
      label: 'Reconnecting',
      borderColor: 'border-[#FF5C5C]/40',
      bgColor: 'bg-[#181B21]',
    },
    disconnected: {
      dotColor: 'bg-[#FF5C5C]',
      textColor: 'text-[#FF5C5C]',
      label: 'Offline',
      borderColor: 'border-[#FF5C5C]/40',
      bgColor: 'bg-[#181B21]',
    },
  }[signalingStatus];

  return (
    <header className="fixed top-0 w-full z-40 bg-[#0B0C0F]/90 backdrop-blur-xl pt-safe border-b border-[#272A31] select-none">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Left Side: Back button or Logo + Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          {currentRoomCode ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                onNavigateHome();
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#9B9DA3] hover:text-[#F5F3EE] rounded-full hover:bg-[#181B21] transition-colors cursor-pointer"
              title="Return Home"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">arrow_back</span>
            </button>
          ) : null}

          {/* Velora Logo & Title */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigateHome();
            }}
            className="flex items-center gap-2 text-left cursor-pointer focus:outline-none group"
            id="brand-logo-btn"
          >
            <span className="font-editorial text-xl sm:text-2xl tracking-tight text-[#F5F3EE] group-hover:text-[#E8D8B8] transition-colors">
              Velora
            </span>
          </button>
        </div>

        {/* Right actions: Connection Pill, Room Status & Settings/Profile Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Connection / Signaling Status Pill */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              if (onOpenSettings) onOpenSettings();
            }}
            className={`group flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full border text-[10px] font-mono transition-all cursor-pointer ${statusConfig.bgColor} ${statusConfig.borderColor}`}
            title={`Signaling Status: ${statusConfig.label}${
              pingLatency ? ` (${pingLatency}ms ping)` : ''
            }${isLowDataActive ? ' • Low Data Active' : ''}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
            <span className={`font-semibold tracking-wider uppercase font-mono text-[9px] ${statusConfig.textColor} transition-colors`}>
              {statusConfig.label}
            </span>
            {isLowDataActive && (
              <span className="hidden md:inline text-[8px] bg-[#E8D8B8]/15 text-[#E8D8B8] px-1 py-0.2 rounded-full border border-[#E8D8B8]/30 font-mono">
                Low Data
              </span>
            )}
            {signalingStatus === 'connected' && pingLatency !== null && pingLatency !== undefined && (
              <span className="hidden sm:inline text-[9px] text-[#6E7179] border-l border-[#272A31] pl-1.5 font-mono">
                {pingLatency}ms
              </span>
            )}
          </button>

          {/* Active Room Badge (when inside a room) */}
          {currentRoomCode && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#181B21] border border-[#272A31] rounded-full">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    memberCount === 2 ? 'bg-[#7ED6A5]' : 'bg-[#E8D8B8]'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    memberCount === 2 ? 'bg-[#7ED6A5]' : 'bg-[#E8D8B8]'
                  }`}
                ></span>
              </span>
              <span className="font-mono text-[10px] text-[#9B9DA3]">
                {memberCount ?? 1}/2
              </span>
            </div>
          )}

          {/* Profile / Account button */}
          {onOpenProfile && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenProfile();
              }}
              id="navbar-profile-btn"
              className="w-8 h-8 rounded-full bg-[#181B21] border border-[#272A31] text-[#E8D8B8] hover:border-[#E8D8B8]/60 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
              title="Private Settings & Session"
            >
              <span className="material-symbols-outlined text-[17px]">person</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
