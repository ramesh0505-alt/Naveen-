import React from 'react';
import { ArrowRight, KeyRound, Lock, ShieldCheck, Sparkles, MessageSquare, Phone, Flame } from 'lucide-react';

interface LandingPageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, onJoinRoom }) => {
  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-140px)] items-center justify-between p-4 sm:p-8 relative overflow-hidden bg-[#0b1326] text-[#dae2fd] font-sans">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
        <div className="w-[500px] h-[500px] bg-[#4d8eff]/15 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      {/* Main Centered Hero Content */}
      <div className="my-auto max-w-sm w-full flex flex-col items-center text-center relative z-10 py-6">
        {/* Glowing Lock Badge */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-[#adc6ff]/20 rounded-full blur-xl scale-150 animate-pulse"></div>
          <div className="relative bg-[#171f33] w-24 h-24 rounded-full flex items-center justify-center shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4d8eff]/20 to-transparent"></div>
            <Lock className="w-10 h-10 text-[#adc6ff] drop-shadow-[0_0_15px_rgba(77,142,255,0.5)] relative z-10" />
          </div>
        </div>

        {/* Sanctuary Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171f33] border border-white/5 text-[11px] font-mono text-[#adc6ff] mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="tracking-widest uppercase">Ephemeral Space</span>
        </div>

        {/* Title and Tagline */}
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#dae2fd] mb-2">
          Private Sanctuary
        </h1>
        <p className="text-sm text-[#c2c6d6] leading-relaxed max-w-[280px] mb-8">
          A secure, 2-person space designed with end-to-end privacy and zero digital footprints.
        </p>

        {/* Action Buttons Container */}
        <div className="w-full space-y-3">
          <button
            onClick={onCreateRoom}
            id="landing-create-room-btn"
            className="w-full py-4 rounded-full bg-[#adc6ff] text-[#002e6a] font-semibold text-base shadow-[0_8px_24px_rgba(173,198,255,0.25)] hover:bg-[#adc6ff]/90 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>Create Private Room</span>
          </button>

          <button
            onClick={onJoinRoom}
            id="landing-join-room-btn"
            className="w-full py-3.5 rounded-full bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] font-semibold text-sm border border-white/5 transition-colors active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-[#adc6ff]" />
            <span>Enter with Code & PIN</span>
          </button>
        </div>

        {/* Micro-Features Grid */}
        <div className="grid grid-cols-3 gap-2 w-full mt-10 pt-6 border-t border-white/5 text-center">
          <div className="p-2.5 rounded-2xl bg-[#171f33]/60 border border-white/5 flex flex-col items-center">
            <MessageSquare className="w-4 h-4 text-[#adc6ff] mb-1" />
            <span className="text-[10px] font-mono text-[#c2c6d6]">Ephemeral Chat</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#171f33]/60 border border-white/5 flex flex-col items-center">
            <Phone className="w-4 h-4 text-[#adc6ff] mb-1" />
            <span className="text-[10px] font-mono text-[#c2c6d6]">WebRTC Audio</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#171f33]/60 border border-white/5 flex flex-col items-center">
            <Flame className="w-4 h-4 text-[#ffb786] mb-1" />
            <span className="text-[10px] font-mono text-[#c2c6d6]">Auto Burn</span>
          </div>
        </div>
      </div>

      {/* Footer Sub-Note */}
      <div className="text-[11px] font-mono text-[#8c909f] text-center opacity-80 pb-2">
        Zero server storage • Auto-purged upon closure
      </div>
    </div>
  );
};
