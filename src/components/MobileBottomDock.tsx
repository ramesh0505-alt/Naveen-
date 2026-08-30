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
  onOpenRoomInfo,
  onOpenSettings,
  onStartCall,
  isCallActive,
}) => {
  // During active chat, DO NOT render the bottom dock so the conversation gets full screen height
  if (currentScreen === 'CHAT') {
    return null;
  }

  // Default Home / Landing Bottom Navigation
  return (
    <nav
      id="mobile-bottom-navigation-dock"
      className="fixed bottom-0 w-full z-40 pb-safe bg-[#0B0C0F]/90 backdrop-blur-xl border-t border-[#272A31] select-none"
    >
      <div className="max-w-md mx-auto h-16 flex items-center justify-around px-4">
        {/* Home Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onNavigateHome();
          }}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            currentScreen === 'LANDING' ? 'text-[#E8D8B8]' : 'text-[#9B9DA3] hover:text-[#F5F3EE]'
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
          className="flex flex-col items-center gap-1 text-[#9B9DA3] hover:text-[#E8D8B8] transition-colors cursor-pointer"
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
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            currentScreen === 'JOIN' ? 'text-[#E8D8B8]' : 'text-[#9B9DA3] hover:text-[#F5F3EE]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">group_add</span>
          <span className="font-label-sm text-[11px]">Join</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenProfile();
          }}
          className="flex flex-col items-center gap-1 text-[#9B9DA3] hover:text-[#E8D8B8] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">person</span>
          <span className="font-label-sm text-[11px]">Profile</span>
        </button>
      </div>
    </nav>
  );
};
