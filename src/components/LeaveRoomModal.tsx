import React from 'react';
import { triggerHaptic } from '../utils/helpers';

interface LeaveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isOwner?: boolean;
}

export const LeaveRoomModal: React.FC<LeaveRoomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isOwner = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/90 backdrop-blur-2xl animate-fade-in font-sans select-none">
      <div
        id="leave-room-modal"
        className="w-full max-w-sm bg-[#121419] border border-[#FF5C5C]/30 shadow-2xl p-6 text-[#F5F3EE] rounded-[28px] animate-scale-up text-center relative overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle Ambient Red Glow */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-[#FF5C5C]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-12 h-12 rounded-full bg-[#FF5C5C]/10 border border-[#FF5C5C]/30 flex items-center justify-center mx-auto mb-4 text-[#FF5C5C]">
          <span className="material-symbols-outlined text-[24px]">logout</span>
        </div>

        <h3 className="font-editorial text-xl font-bold text-[#F5F3EE] mb-2 tracking-tight">
          Leave Private Room?
        </h3>

        <p className="font-body-sm text-xs text-[#9B9DA3] mb-6 leading-relaxed px-2">
          You will leave this private space. Your active session on this device will be revoked, and you will not be able to resume without re-joining.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            id="cancel-leave-room-btn"
            className="w-full sm:flex-1 py-3 rounded-full bg-[#181B21] border border-[#272A31] text-xs font-semibold text-[#9B9DA3] hover:text-[#F5F3EE] hover:bg-[#272A31] active:scale-95 transition-all cursor-pointer min-h-[44px]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('heavy');
              onConfirm();
            }}
            id="confirm-leave-room-btn"
            className="w-full sm:flex-1 py-3 rounded-full bg-[#FF5C5C] hover:bg-[#FF4545] active:scale-95 text-white text-xs font-semibold font-mono tracking-wide shadow-lg shadow-[#FF5C5C]/20 transition-all cursor-pointer min-h-[44px]"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
};
