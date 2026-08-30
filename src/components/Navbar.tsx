import React from 'react';
import type { RoomStatus, SignalingStatus } from '../types';
import { triggerHaptic } from '../utils/helpers';

export const VELORA_SIGNATURE_LOGO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDKnkdyj0JfOsDxLIKJLA3bL6omr2HZClagaqw0opPkNuRaLsWXfrRoBrWnfmT3DN6_cfxxdEh3HIlBlrqyg-wWaaFNUOwcoywY31rP1vRL8PP6XOEZS0pdVjsyUmBuGx_liS4jGy8AbkExOcIPNHIKFIY8TvWZwNQN4bHnRfzTc236uYkW9wD9C7mM9VUXY94-VXgF2lCB2f_fQ7iaaO6dUN2FaBw9z1nTz1TfS5nbAiN8QedvLwMH';

interface NavbarProps {
  currentRoomCode?: string;
  roomStatus?: RoomStatus;
  memberCount?: number;
  signalingStatus?: SignalingStatus;
  pingLatency?: number | null;
  isLowDataActive?: boolean;
  unreadNotificationsCount?: number;
  screenTitle?: string;
  onNavigateHome: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoomCode,
  roomStatus,
  memberCount,
  signalingStatus = 'connected',
  pingLatency,
  isLowDataActive = false,
  unreadNotificationsCount = 0,
  screenTitle = 'Home',
  onNavigateHome,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
}) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#111318]/85 backdrop-blur-xl pt-safe border-b border-white/[0.04] shadow-[0_1px_8px_rgba(0,0,0,0.15)] select-none">
      <div className="h-16 flex items-center justify-between px-6 max-w-6xl mx-auto">
        {/* Left: Signature Logo + Screen Title */}
        <div className="flex items-center gap-3.5">
          {currentRoomCode ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                onNavigateHome();
              }}
              className="w-9 h-9 flex items-center justify-center text-[#909095] hover:text-[#e2e2e9] rounded-full hover:bg-[#1e2025] transition-colors cursor-pointer mr-1"
              title="Return Home"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          ) : null}

          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigateHome();
            }}
            className="flex items-center gap-3.5 cursor-pointer focus:outline-none group text-left"
            id="brand-logo-btn"
          >
            <img
              src={VELORA_SIGNATURE_LOGO}
              alt="Velora Signature Logo"
              className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-display-sm text-[22px] tracking-tight text-[#e2e2e9] leading-none">
              {screenTitle}
            </span>
          </button>
        </div>

        {/* Right Action Icons: Notification Center & Person Profile */}
        <div className="flex items-center gap-2.5">
          {/* Notification Center button */}
          {onOpenNotifications && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenNotifications();
              }}
              id="navbar-notifications-btn"
              className="relative w-10 h-10 rounded-full bg-[#1e2025] border border-[#46464b]/30 text-[#c7c6cb] hover:text-[#e2e2e9] hover:bg-[#282a2f] flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Notification Center"
            >
              <span className="material-symbols-outlined text-[19px]">notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ffb3af] text-[#230002] font-mono text-[9px] font-bold flex items-center justify-center shadow-md">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Profile / Account button */}
          {onOpenProfile && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenProfile();
              }}
              id="navbar-profile-btn"
              className="w-10 h-10 rounded-full bg-[#33353a] hover:bg-[#37393f] flex items-center justify-center text-[#e2e2e9] transition-all cursor-pointer shadow-sm active:scale-95"
              title="Profile & Settings"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
