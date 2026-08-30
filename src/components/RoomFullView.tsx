import React from 'react';

interface RoomFullViewProps {
  roomCode?: string;
  onGoHome: () => void;
}

export const RoomFullView: React.FC<RoomFullViewProps> = ({
  roomCode,
  onGoHome,
}) => {
  return (
    <div className="flex flex-col w-full h-full min-h-[calc(100vh-140px)] items-center justify-center p-6 sm:p-8 animate-fade-in select-none">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-5 bg-[#1e2025] border border-white/5 rounded-[28px] p-7 shadow-2xl">
        {/* Icon Container */}
        <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-[#111318] border border-white/5 shadow-xl mb-1">
          <span className="material-symbols-outlined text-[#ffb3af] text-[30px]">group</span>

          {/* Badge */}
          <div className="absolute -bottom-1 -right-1 bg-[#ba1a1a] text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg text-[10px] font-mono font-bold">
            <span className="material-symbols-outlined text-[11px]">lock</span>
            <span>2/2</span>
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#111318] border border-white/5 font-mono text-[10px] text-[#ffb3af] mb-1">
            <span>CAPACITY REACHED</span>
            {roomCode && <span className="text-[#e2e2e9]">#{roomCode}</span>}
          </div>
          <h1 className="font-display-sm text-2xl text-[#e2e2e9] tracking-tight">
            Room Full
          </h1>
          <p className="font-body-md text-xs text-[#c7c6cb] max-w-[260px] mx-auto leading-relaxed">
            This space is strictly restricted to two participants. The session is currently at maximum capacity.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-1 w-full">
          <button
            onClick={onGoHome}
            id="room-full-return-btn"
            className="w-full bg-[#c7c6ca] hover:bg-[#e3e2e6] text-[#303034] font-label-md font-bold text-sm rounded-full py-3 px-5 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Return to Entrance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
