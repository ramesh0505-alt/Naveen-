import React from 'react';
import { triggerHaptic } from '../utils/helpers';

interface MobileBottomDockProps {
  currentScreen: string;
  hasActiveRoom: boolean;
  onNavigateHome: () => void;
  onOpenCreate: () => void;
  onOpenJoin: () => void;
  onOpenProfile: () => void;
  onOpenRoomInfo?: () => void;
  onOpenSettings?: () => void;
  onStartCall?: () => void;
  isCallActive?: boolean;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  currentScreen,
  hasActiveRoom,
  onNavigateHome,
  onOpenCreate,
  onOpenJoin,
  onOpenProfile,
}) => {
  // During active chat, hide the bottom dock so the conversation and composer get full screen real estate
  if (currentScreen === 'CHAT') {
    return null;
  }

  const isHome = currentScreen === 'LANDING';
  const isJoin = currentScreen === 'JOIN';

  return (
    <nav
      id="mobile-bottom-navigation-dock"
      className="fixed bottom-0 w-full z-50 bg-[#111318]/85 backdrop-blur-xl pb-safe border-t border-white/[0.05] shadow-[0_-1px_8px_rgba(0,0,0,0.15)] select-none"
    >
      <div className="h-16 flex items-center justify-around px-4 max-w-lg mx-auto">
        {/* Home Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onNavigateHome();
          }}
          className={`flex flex-col items-center gap-1 transition-all h-12 w-12 justify-center cursor-pointer ${
            isHome ? 'text-[#ffb3af]' : 'text-[#c7c6cb] hover:text-[#e2e2e9]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">home</span>
          <span className="font-label-sm text-[11px]">Home</span>
        </button>

        {/* Create Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenCreate();
          }}
          className="flex flex-col items-center gap-1 text-[#c7c6cb] hover:text-[#e2e2e9] transition-all h-12 w-12 justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">add_circle</span>
          <span className="font-label-sm text-[11px]">Create</span>
        </button>

        {/* Join Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenJoin();
          }}
          className={`flex flex-col items-center gap-1 transition-all h-12 w-12 justify-center cursor-pointer ${
            isJoin ? 'text-[#ffb3af]' : 'text-[#c7c6cb] hover:text-[#e2e2e9]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">explore</span>
          <span className="font-label-sm text-[11px]">Join</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenProfile();
          }}
          className="flex flex-col items-center gap-1 text-[#c7c6cb] hover:text-[#e2e2e9] transition-all h-12 w-12 justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">person_book</span>
          <span className="font-label-sm text-[11px]">Profile</span>
        </button>
      </div>
    </nav>
  );
};
