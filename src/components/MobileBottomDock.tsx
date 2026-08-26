import React from 'react';
import { MessageSquare, Phone, Share2, PlusCircle, LogIn, Sparkles } from 'lucide-react';
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
  return (
    <nav
      id="mobile-bottom-navigation-dock"
      className="fixed bottom-0 w-full z-40 pb-safe bg-[#0b1326]/80 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.3)] border-t border-white/5 font-sans select-none"
    >
      <div className="max-w-md mx-auto h-16 flex items-center justify-around px-2">
        {/* Chat / Space Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            if (hasActiveRoom && currentScreen !== 'CHAT') {
              onNavigateHome();
            } else if (!hasActiveRoom) {
              onOpenCreate();
            }
          }}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            currentScreen === 'CHAT' || currentScreen === 'LANDING'
              ? 'text-[#adc6ff]'
              : 'text-[#c2c6d6] hover:text-[#dae2fd]'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs font-medium">Chat</span>
        </button>

        {/* Call Tab */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            if (onStartCall) {
              onStartCall();
            } else if (hasActiveRoom) {
              // start call if possible
            } else {
              onOpenCreate();
            }
          }}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            isCallActive
              ? 'text-[#adc6ff]'
              : 'text-[#c2c6d6] hover:text-[#dae2fd]'
          }`}
        >
          <Phone className="w-5 h-5" />
          <span className="text-xs font-medium">Call</span>
        </button>

        {/* Join / Secure Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenJoin();
          }}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            currentScreen === 'JOIN' || currentScreen === 'SHARE'
              ? 'text-[#adc6ff]'
              : 'text-[#c2c6d6] hover:text-[#dae2fd]'
          }`}
        >
          <Share2 className="w-5 h-5" />
          <span className="text-xs font-medium">Secure</span>
        </button>
      </div>
    </nav>
  );
};
