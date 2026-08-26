import React from 'react';
import {
  MessageSquare,
  PlusCircle,
  LogIn,
  ShieldCheck,
  Smartphone,
  PhoneCall,
  Flame,
  Home,
  Sliders,
} from 'lucide-react';
import { triggerHaptic } from '../utils/helpers';

interface MobileBottomDockProps {
  currentScreen: string;
  hasActiveRoom: boolean;
  onNavigateHome: () => void;
  onOpenCreate: () => void;
  onOpenJoin: () => void;
  onOpenInstall: () => void;
  onOpenSettings?: () => void;
  isLowDataActive?: boolean;
  onStartCall?: () => void;
  isCallActive?: boolean;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  currentScreen,
  hasActiveRoom,
  onNavigateHome,
  onOpenCreate,
  onOpenJoin,
  onOpenInstall,
  onOpenSettings,
  isLowDataActive = false,
  onStartCall,
  isCallActive,
}) => {
  // If we are currently in CHAT screen, the chat input is already docked at the bottom.
  // We can render a subtle floating mobile quick action dock for navigation when on LANDING, SHARE, WAITING, JOIN, or EXPIRED.
  const isChatScreen = currentScreen === 'CHAT';

  if (isChatScreen) {
    return null;
  }

  return (
    <nav
      id="mobile-bottom-navigation-dock"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0E0E0E]/95 backdrop-blur-xl border-t border-[#222222] px-2 sm:px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl transition-all select-none"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Home Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onNavigateHome();
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'LANDING'
              ? 'text-white font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Home className={`w-4.5 h-4.5 ${currentScreen === 'LANDING' ? 'text-white' : ''}`} />
          <span className="text-[10px] font-mono tracking-tight">Home</span>
        </button>

        {/* Create Room Tab */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenCreate();
          }}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <PlusCircle className="w-4.5 h-4.5 text-emerald-400" />
          <span className="text-[10px] font-mono tracking-tight">Create</span>
        </button>

        {/* Join Room Tab */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenJoin();
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'JOIN'
              ? 'text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <LogIn className="w-4.5 h-4.5 text-sky-400" />
          <span className="text-[10px] font-mono tracking-tight">Join PIN</span>
        </button>

        {/* Low Data / Settings Tab */}
        {onOpenSettings && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              isLowDataActive ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Sliders className="w-4.5 h-4.5" />
              {isLowDataActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-mono tracking-tight">Data</span>
          </button>
        )}

        {/* Install Mobile App Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenInstall();
          }}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-zinc-400 hover:text-amber-300 transition-all cursor-pointer"
        >
          <Smartphone className="w-4.5 h-4.5 text-amber-400" />
          <span className="text-[10px] font-mono tracking-tight">App PWA</span>
        </button>
      </div>
    </nav>
  );
};
