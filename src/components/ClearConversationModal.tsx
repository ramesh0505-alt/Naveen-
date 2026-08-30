import React, { useEffect } from 'react';
import { triggerHaptic } from '../utils/helpers';

interface ClearConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isClearing?: boolean;
}

export const ClearConversationModal: React.FC<ClearConversationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isClearing = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="clear-conversation-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-conversation-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/90 backdrop-blur-xl animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isClearing) {
          triggerHaptic('light');
          onClose();
        }
      }}
    >
      <div className="bg-[#121419] border border-[#272A31] rounded-[24px] max-w-md w-full overflow-hidden shadow-2xl text-[#F5F3EE] animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-[#272A31] flex items-center justify-between bg-[#181B21]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FF5C5C]/10 border border-[#FF5C5C]/30 flex items-center justify-center text-[#FF5C5C]">
              <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            </div>
            <div>
              <h2
                id="clear-conversation-title"
                className="font-headline-md text-base font-bold text-[#F5F3EE]"
              >
                Clear Conversation
              </h2>
              <p className="font-body-sm text-xs text-[#9B9DA3]">
                Irreversible Action
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            disabled={isClearing}
            id="close-clear-modal-btn"
            className="w-8 h-8 rounded-full bg-[#121419] hover:bg-[#181B21] text-[#9B9DA3] hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[#FF5C5C]/10 border border-[#FF5C5C]/30 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#FF5C5C] text-[20px] flex-shrink-0 mt-0.5">
              warning
            </span>
            <div className="font-body-sm text-xs sm:text-sm text-[#F5F3EE] leading-relaxed">
              <strong className="font-semibold block mb-1 text-[#FF5C5C]">
                Removes messages for both participants
              </strong>
              This action will instantly and permanently wipe all chat history, voice notes, and media for <strong>both people</strong> in this private room.
            </div>
          </div>

          <p className="font-body-sm text-xs text-[#9B9DA3] leading-relaxed">
            Neither participant will be able to recover these messages once cleared from the session memory.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#181B21] border-t border-[#272A31] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            disabled={isClearing}
            id="cancel-clear-btn"
            className="px-4 py-2 rounded-full bg-[#121419] hover:bg-[#272A31] text-[#9B9DA3] hover:text-[#F5F3EE] font-label-md text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('heavy');
              onConfirm();
            }}
            disabled={isClearing}
            id="confirm-clear-btn"
            className="px-5 py-2 rounded-full bg-[#FF5C5C] hover:bg-[#FF7070] text-white font-label-md text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>{isClearing ? 'Clearing...' : 'Clear for Both'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
