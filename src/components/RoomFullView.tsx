import React from 'react';
import { Users, Lock, LogIn, ArrowLeft } from 'lucide-react';

interface RoomFullViewProps {
  roomCode?: string;
  onGoHome: () => void;
}

export const RoomFullView: React.FC<RoomFullViewProps> = ({
  roomCode,
  onGoHome,
}) => {
  return (
    <div className="flex flex-col w-full h-full min-h-[calc(100vh-140px)] items-center justify-center p-4 sm:p-8 animate-fade-in font-sans">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* Icon Container with glowing background */}
        <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-[#2d3449] shadow-2xl mb-2 group">
          <div className="absolute inset-0 rounded-full bg-[#4d8eff]/20 blur-xl group-hover:bg-[#4d8eff]/30 transition-colors duration-500"></div>
          <Users className="w-12 h-12 text-[#adc6ff] relative z-10" />

          {/* Badge */}
          <div className="absolute -bottom-2 -right-2 bg-[#93000a] text-[#ffdad6] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md border border-white/10 text-xs font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span className="font-semibold">2/2</span>
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-2 px-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#222a3d] border border-white/5 text-[11px] font-mono text-[#adc6ff] mb-1">
            <span>ROOM LIMIT REACHED</span>
            {roomCode && <span className="text-[#c2c6d6]">#{roomCode}</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#dae2fd] tracking-tight">
            Private Room Full
          </h1>
          <p className="text-sm text-[#c2c6d6] max-w-[300px] mx-auto leading-relaxed">
            This sanctuary is strictly limited to two participants. The private room you are trying to access is currently occupied.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-4 w-full">
          <button
            onClick={onGoHome}
            id="room-full-return-btn"
            className="w-full bg-[#adc6ff] text-[#002e6a] font-semibold text-base rounded-full py-4 px-6 flex items-center justify-center gap-2 hover:bg-[#adc6ff]/90 transition-all active:scale-95 shadow-[0_8px_32px_rgba(77,142,255,0.25)] cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span>Return to Entrance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
