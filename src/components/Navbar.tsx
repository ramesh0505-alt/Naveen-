import React from 'react';
import { Lock, ArrowLeft, User, Shield, Sliders } from 'lucide-react';
import type { RoomStatus } from '../types';
import { triggerHaptic } from '../utils/helpers';

interface NavbarProps {
  currentRoomCode?: string;
  roomStatus?: RoomStatus;
  memberCount?: number;
  onNavigateHome: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  isLowDataActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoomCode,
  roomStatus,
  memberCount,
  onNavigateHome,
  onOpenProfile,
  onOpenSettings,
  isLowDataActive = false,
}) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#0b1326]/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.3)] border-b border-white/5 font-sans selection:bg-[#4d8eff]/30 selection:text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left Side: Back button or Logo + Title */}
        <div className="flex items-center gap-3">
          {currentRoomCode ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                onNavigateHome();
              }}
              className="w-9 h-9 flex items-center justify-center text-[#c2c6d6] hover:text-[#dae2fd] rounded-full hover:bg-[#171f33] transition-colors cursor-pointer"
              title="Return Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}

          {/* Nocturne Logo & Title */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigateHome();
            }}
            className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none group"
            id="brand-logo-btn"
          >
            {/* Logo Badge */}
            <div className="w-8 h-8 rounded-full bg-[#171f33] border border-white/10 flex items-center justify-center text-[#adc6ff] shadow-sm group-hover:border-[#adc6ff]/40 transition-colors">
              <Lock className="w-4 h-4" />
            </div>

            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#dae2fd] leading-tight">
                {currentRoomCode ? `Room ${currentRoomCode}` : 'Nocturne'}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#adc6ff] pulsate"></div>
                <span className="text-[9px] uppercase tracking-widest text-[#adc6ff]/80 font-mono font-semibold">
                  Secure Connection
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Right actions: Room Status / Low Data / Profile Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Room Badge */}
          {currentRoomCode && (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#171f33] border border-white/5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    memberCount === 2 ? 'bg-[#adc6ff]' : 'bg-[#ffb786]'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    memberCount === 2 ? 'bg-[#adc6ff] shadow-[0_0_8px_rgba(173,198,255,0.8)]' : 'bg-[#ffb786]'
                  }`}
                ></span>
              </span>
              <span className="text-[11px] font-mono text-[#c2c6d6]">
                {memberCount ?? 1}/2 Connected
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
              className="w-8 h-8 rounded-full bg-[#adc6ff] hover:bg-[#d8e2ff] text-[#002e6a] flex items-center justify-center transition-transform active:scale-95 shadow-[0_0_12px_rgba(173,198,255,0.25)] cursor-pointer"
              title="Private Profile & Settings"
            >
              <User className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
