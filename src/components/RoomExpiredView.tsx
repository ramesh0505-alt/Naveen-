import React from 'react';
import { Lock, DoorOpen, PlusCircle } from 'lucide-react';

interface RoomExpiredViewProps {
  reason?: string;
  onCreateNew: () => void;
  onGoHome: () => void;
}

export const RoomExpiredView: React.FC<RoomExpiredViewProps> = ({
  reason = 'This private room is no longer available. For your security, ephemeral spaces are automatically closed after the session ends.',
  onCreateNew,
  onGoHome,
}) => {
  return (
    <div className="flex flex-col w-full h-[calc(100vh-140px)] min-h-[500px] items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-[#0b1326] animate-fade-in font-sans">
      {/* Ambient glowing background simulating the void */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
        <div className="w-[320px] h-[320px] bg-[#93000a]/20 rounded-full blur-[80px] animate-pulse"></div>
      </div>
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
        <div className="w-[240px] h-[240px] bg-[#4d8eff]/10 rounded-full blur-[60px]"></div>
      </div>

      {/* Core Content Container with Glassmorphism */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full bg-[#131b2e]/85 backdrop-blur-3xl rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-t border-white/5 text-center">
        {/* Icon Container */}
        <div className="w-16 h-16 rounded-full bg-[#222a3d] flex items-center justify-center mb-5 shadow-inner relative group transition-transform duration-500 hover:scale-105">
          <div className="absolute inset-0 rounded-full border border-[#424754]/30 group-hover:border-[#adc6ff]/30 transition-colors"></div>
          <Lock className="w-8 h-8 text-[#8c909f] opacity-85" />
        </div>

        {/* Typography */}
        <h1 className="text-2xl font-semibold text-[#dae2fd] mb-2">
          Room Expired
        </h1>
        <p className="text-sm text-[#c2c6d6] mb-8 max-w-[280px] leading-relaxed">
          {reason}
        </p>

        {/* Action Button */}
        <div className="w-full space-y-3">
          <button
            onClick={onGoHome}
            id="expired-return-btn"
            className="w-full bg-[#adc6ff] text-[#002e6a] font-semibold text-sm py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-[#adc6ff]/90 transition-colors shadow-[0_0_20px_rgba(173,198,255,0.25)] active:scale-[0.98] cursor-pointer"
          >
            <DoorOpen className="w-4 h-4" />
            <span>Return to Entrance</span>
          </button>

          <button
            onClick={onCreateNew}
            id="expired-create-new-btn"
            className="w-full bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] text-xs font-semibold py-3 rounded-full flex items-center justify-center gap-2 border border-white/5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#adc6ff]" />
            <span>Create New Room</span>
          </button>
        </div>

        {/* Subtle decorative line */}
        <div className="w-12 h-[1px] bg-[#424754]/40 mt-6 rounded-full"></div>
      </div>
    </div>
  );
};
