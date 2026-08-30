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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111318]/90 backdrop-blur-xl animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isClearing) {
          triggerHaptic('light');
          onClose();
        }
      }}
    >
      <div className="bg-[#1e2025] border border-white/5 rounded-[24px] max-w-md w-full overflow-hidden shadow-2xl text-[#e2e2e9] animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#111318]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#93000a]/20 border border-[#ffb4ab]/30 flex items-center justify-center text-[#ffb4ab]">
              <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            </div>
            <div>
              <h2
                id="clear-conversation-title"
                className="font-headline-md text-base font-bold text-[#e2e2e9]"
              >
                Clear Conversation
              </h2>
              <p className="font-body-md text-xs text-[#c7c6cb]">
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
            className="w-8 h-8 rounded-full bg-[#1e2025] hover:bg-[#282a2f] text-[#c7c6cb] hover:text-[#e2e2e9] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[#93000a]/20 border border-[#ffb4ab]/30 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] flex-shrink-0 mt-0.5">
              warning
            </span>
            <div className="font-body-md text-xs sm:text-sm text-[#e2e2e9] leading-relaxed">
              <strong className="font-semibold block mb-1 text-[#ffb4ab]">
                Removes messages for both participants
              </strong>
              This action will instantly and permanently wipe all chat history, voice notes, and media for <strong>both people</strong> in this private room.
            </div>
          </div>

          <p className="font-body-md text-xs text-[#909095] leading-relaxed">
            Neither participant will be able to recover these messages once cleared from the session memory.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#111318] border-t border-white/5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            disabled={isClearing}
            id="cancel-clear-btn"
            className="px-4 py-2 rounded-full bg-[#1e2025] hover:bg-[#282a2f] text-[#c7c6cb] hover:text-[#e2e2e9] font-label-md text-xs font-semibold cursor-pointer transition-colors"
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
            className="px-5 py-2 rounded-full bg-[#ba1a1a] hover:bg-[#de3730] text-white font-label-md text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>{isClearing ? 'Clearing...' : 'Clear for Both'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
