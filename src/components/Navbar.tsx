import React from 'react';
import { Lock, Smartphone, Monitor, Download, Sliders, Signal, Wifi } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full border-b border-[#2A2A2A] bg-[#0C0C0C]/95 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-8 h-16 sm:h-18 flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onNavigateHome();
          }}
          className="flex flex-col text-left group focus:outline-none cursor-pointer"
          id="brand-logo-btn"
        >
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#888] group-hover:text-white transition-colors">
            Secure Mobile 2P
          </span>
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-lg sm:text-2xl font-light tracking-tighter text-[#F0F0F0]">
              PRIVATE<span className="italic font-serif text-white">2p</span>
            </h1>
            <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] px-1 sm:px-1.5 py-0.5 border border-[#333] text-emerald-400 font-mono rounded">
              APP
            </span>
          </div>
        </button>

        {/* Right actions: Low Data Settings, Phone mode toggle, Install app, and Room / Privacy Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Settings / Data Saver Button */}
          {onOpenSettings && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenSettings();
              }}
              id="nav-settings-btn"
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
                isLowDataActive
                  ? 'bg-amber-950/60 border-amber-800/80 hover:border-amber-500 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300'
              }`}
              title="Connection & Data Saver Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">
                {isLowDataActive ? 'Low Data' : 'Settings'}
              </span>
              {isLowDataActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
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
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-500/60 hover:bg-zinc-800 text-amber-300 text-[11px] font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Install Mobile App / PWA"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">App</span>
            </button>
          )}

          {/* Desktop Phone Frame Toggle (visible on screens >= 640px) */}
          {onToggleFrameMode && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onToggleFrameMode();
              }}
              id="toggle-phone-frame-btn"
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[11px] font-mono transition-colors cursor-pointer"
              title={isFrameMode ? 'Switch to responsive view' : 'Preview in mobile phone mockup'}
            >
              {isFrameMode ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-sky-400" />
                  <span>Full View</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phone Frame</span>
                </>
              )}
            </button>
          )}

          {currentRoomCode ? (
            <div className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 bg-[#161616] border border-[#2A2A2A] rounded-lg">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    memberCount === 2 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    memberCount === 2 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
              <span className="text-[11px] sm:text-xs font-mono tracking-wider text-[#E0E0E0]">
                {currentRoomCode}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#777] font-mono border-l border-[#2A2A2A] pl-2 hidden xs:inline">
                {memberCount ?? 1}/2
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[#888]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"></span>
                Zero Trace
              </span>
              <span className="text-[#333]">•</span>
              <span>Encrypted</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

