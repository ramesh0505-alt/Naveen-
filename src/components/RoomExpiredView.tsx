import React from 'react';

interface RoomExpiredViewProps {
  reason?: string;
  onCreateNew: () => void;
  onGoHome: () => void;
}

export const RoomExpiredView: React.FC<RoomExpiredViewProps> = ({
  reason = 'This private room is no longer active. For zero-footprint security, ephemeral spaces are automatically purged once closed.',
  onCreateNew,
  onGoHome,
}) => {
  return (
    <div className="flex flex-col w-full h-[calc(100vh-140px)] min-h-[500px] items-center justify-center p-6 sm:p-8 relative overflow-hidden animate-fade-in select-none">
      {/* Core Content Container with Glassmorphism */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full bg-[#121419] rounded-[28px] p-7 shadow-2xl border border-[#272A31] text-center">
        {/* Icon Container */}
        <div className="w-16 h-16 rounded-full bg-[#181B21] border border-[#272A31] flex items-center justify-center mb-4 relative group">
          <span className="material-symbols-outlined text-[#FF5C5C] text-[28px]">lock_reset</span>
        </div>

        {/* Typography */}
        <h1 className="font-editorial text-2xl text-[#F5F3EE] mb-1.5 tracking-tight">
          Room Expired
        </h1>
        <p className="font-body-sm text-xs text-[#9B9DA3] mb-6 max-w-[260px] leading-relaxed">
          {reason}
        </p>

        {/* Action Button */}
        <div className="w-full space-y-2.5">
          <button
            onClick={onGoHome}
            id="expired-return-btn"
            className="w-full bg-[#E8D8B8] text-[#121419] font-label-md font-bold text-xs py-3 rounded-full flex items-center justify-center gap-1.5 hover:bg-[#F0E3C8] transition-colors shadow-md active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Return to Entrance</span>
          </button>

          <button
            onClick={onCreateNew}
            id="expired-create-new-btn"
            className="w-full bg-[#181B21] hover:bg-[#272A31] text-[#E8D8B8] font-label-md text-xs font-semibold py-2.5 rounded-full flex items-center justify-center gap-1.5 border border-[#272A31] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Create New Room</span>
          </button>
        </div>
      </div>
    </div>
  );
};
