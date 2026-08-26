import React from 'react';
import {
  Home,
  PlusCircle,
  LogIn,
  User,
  MessageSquare,
  Phone,
  Info,
  Sliders,
  Shield
} from 'lucide-react';
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
  const inChat = currentScreen === 'CHAT';

  if (inChat) {
    return (
      <nav
        id="mobile-bottom-navigation-dock"
        className="fixed bottom-0 w-full z-40 pb-safe bg-[#0b1326]/90 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.3)] border-t border-white/5 font-sans select-none"
      >
        <div className="max-w-md mx-auto h-16 flex items-center justify-around px-4">
          {/* Chat Tab */}
          <button
            onClick={() => {
              triggerHaptic('light');
            }}
            className="flex flex-col items-center justify-center w-14 h-14 transition-colors text-[#adc6ff] cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-wider mt-1 font-semibold">Chat</span>
          </button>

          {/* Call Tab */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              if (onStartCall) onStartCall();
            }}
            className={`flex flex-col items-center justify-center w-14 h-14 transition-colors cursor-pointer ${
              isCallActive ? 'text-[#adc6ff]' : 'text-[#c2c6d6] hover:text-[#dae2fd]'
            }`}
          >
            <Phone className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-wider mt-1 font-semibold">Call</span>
          </button>

          {/* Room Info Tab */}
          <button
            onClick={() => {
              triggerHaptic('light');
              if (onOpenRoomInfo) onOpenRoomInfo();
            }}
            className="flex flex-col items-center justify-center w-14 h-14 text-[#c2c6d6] hover:text-[#dae2fd] transition-colors cursor-pointer"
          >
            <Info className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-wider mt-1 font-semibold">Room</span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => {
              triggerHaptic('light');
              if (onOpenSettings) onOpenSettings();
            }}
            className="flex flex-col items-center justify-center w-14 h-14 text-[#c2c6d6] hover:text-[#dae2fd] transition-colors cursor-pointer"
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-wider mt-1 font-semibold">Settings</span>
          </button>
        </div>
      </nav>
    );
  }

  // Default Home / Landing Bottom Navigation
  return (
    <nav
      id="mobile-bottom-navigation-dock"
      className="fixed bottom-0 w-full z-40 pb-safe bg-[#0b1326]/90 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.3)] border-t border-white/5 font-sans select-none"
    >
      <div className="max-w-md mx-auto h-16 flex items-center justify-around px-4">
        {/* Home Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onNavigateHome();
          }}
          className={`flex flex-col items-center justify-center w-14 h-14 transition-colors cursor-pointer ${
            currentScreen === 'LANDING' ? 'text-[#adc6ff]' : 'text-[#c2c6d6] hover:text-[#dae2fd]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-mono uppercase tracking-wider mt-1 font-semibold">Home</span>
        </button>

        {/* Create Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenCreate();
          }}
          className="flex flex-col items-center justify-center w-14 h-14 text-[#c2c6d6] hover:text-[#dae2fd] transition-colors cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px] font-mono uppercase tracking-wider mt-1 font-semibold">Create</span>
        </button>

        {/* Join Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenJoin();
          }}
          className={`flex flex-col items-center justify-center w-14 h-14 transition-colors cursor-pointer ${
            currentScreen === 'JOIN' ? 'text-[#adc6ff]' : 'text-[#c2c6d6] hover:text-[#dae2fd]'
          }`}
        >
          <LogIn className="w-5 h-5" />
          <span className="text-[10px] font-mono uppercase tracking-wider mt-1 font-semibold">Join</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenProfile();
          }}
          className="flex flex-col items-center justify-center w-14 h-14 text-[#c2c6d6] hover:text-[#dae2fd] transition-colors cursor-pointer"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-mono uppercase tracking-wider mt-1 font-semibold">Profile</span>
        </button>
      </div>
    </nav>
  );
};
