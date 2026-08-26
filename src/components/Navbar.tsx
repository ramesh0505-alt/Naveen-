import React from 'react';
import { Lock, Smartphone, Monitor, Sliders, ArrowLeft } from 'lucide-react';
import type { RoomStatus } from '../types';
import { triggerHaptic } from '../utils/helpers';

interface NavbarProps {
  currentRoomCode?: string;
  roomStatus?: RoomStatus;
  memberCount?: number;
  onNavigateHome: () => void;
  onOpenInstall?: () => void;
  onOpenSettings?: () => void;
  isLowDataActive?: boolean;
  isFrameMode?: boolean;
  onToggleFrameMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoomCode,
  roomStatus,
  memberCount,
  onNavigateHome,
  onOpenInstall,
  onOpenSettings,
  isLowDataActive = false,
  isFrameMode = false,
  onToggleFrameMode,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b1326]/80 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.3)] border-b border-white/5 font-sans">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Left Side: Back button + Brand Title */}
        <div className="flex items-center gap-2">
          {currentRoomCode ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                onNavigateHome();
              }}
              className="w-10 h-10 flex items-center justify-center text-[#c2c6d6] hover:text-[#dae2fd] rounded-full hover:bg-[#171f33] transition-colors cursor-pointer"
              title="Return Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center text-[#adc6ff] rounded-full bg-[#171f33]/60">
              <Lock className="w-5 h-5" />
            </div>
          )}

          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigateHome();
            }}
            className="flex items-center gap-2 text-left cursor-pointer focus:outline-none"
            id="brand-logo-btn"
          >
            <span className="text-lg sm:text-xl font-semibold tracking-tight text-[#dae2fd]">
              {currentRoomCode ? 'Private Room' : 'Private Space'}
            </span>
          </button>
        </div>

        {/* Right actions: Status, Low Data, Phone Frame, Install App */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Room Badge */}
          {currentRoomCode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#171f33] border border-white/5 rounded-full">
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
              <span className="text-xs font-mono text-[#dae2fd] tracking-wider">
                {currentRoomCode}
              </span>
              <span className="text-[10px] font-mono text-[#8c909f] border-l border-[#424754]/50 pl-2">
                {memberCount ?? 1}/2
              </span>
            </div>
          )}

          {/* Settings / Data Saver Button */}
          {onOpenSettings && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenSettings();
              }}
              id="nav-settings-btn"
              className={`p-2 sm:px-3 sm:py-1.5 rounded-full border text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
                isLowDataActive
                  ? 'bg-[#461f00]/60 border-[#df7412] text-[#ffb786]'
                  : 'bg-[#171f33] border-white/5 text-[#c2c6d6] hover:text-[#dae2fd] hover:bg-[#222a3d]'
              }`}
              title="Connection & Data Saver Settings"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isLowDataActive ? 'Low Data' : 'Settings'}
              </span>
              {isLowDataActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb786] animate-pulse" />
              )}
            </button>
          )}

          {/* Install Mobile App Button */}
          {onOpenInstall && (
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenInstall();
              }}
              id="nav-install-app-btn"
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-[#171f33] border border-white/5 hover:border-[#adc6ff]/50 text-[#adc6ff] text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Install Mobile App / PWA"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">App</span>
            </button>
          )}

          {/* Desktop Phone Frame Toggle */}
          {onToggleFrameMode && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onToggleFrameMode();
              }}
              id="toggle-phone-frame-btn"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171f33] border border-white/5 hover:bg-[#222a3d] text-[#c2c6d6] text-xs font-mono transition-colors cursor-pointer"
              title={isFrameMode ? 'Switch to full responsive view' : 'Preview in mobile phone mockup'}
            >
              {isFrameMode ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-[#4d8eff]" />
                  <span>Full View</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-[#adc6ff]" />
                  <span>Phone Frame</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
