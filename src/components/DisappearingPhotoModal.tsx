import React, { useState, useEffect } from 'react';
import type { MessageItem } from '../types';

interface DisappearingPhotoModalProps {
  message: MessageItem;
  onBurnPhoto: (messageId: string) => void;
  onClose: () => void;
}

export const DisappearingPhotoModal: React.FC<DisappearingPhotoModalProps> = ({
  message,
  onBurnPhoto,
  onClose,
}) => {
  const viewMode = message.viewMode || 'view_once';
  const duration =
    viewMode === 'timed_5'
      ? 5
      : viewMode === 'timed_10'
      ? 10
      : viewMode === 'timed_30'
      ? 30
      : viewMode === 'timed_60'
      ? 60
      : 0;
  const [timeLeft, setTimeLeft] = useState<number>(duration);

  useEffect(() => {
    if (duration > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onBurnPhoto(message.id);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [duration, message.id, onBurnPhoto, onClose]);

  const handleClose = () => {
    onBurnPhoto(message.id);
    onClose();
  };

  const progressPercent = duration > 0 ? (timeLeft / duration) * 100 : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/95 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-[#121419] rounded-[24px] border border-[#272A31] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-[#272A31] flex items-center justify-between bg-[#181B21]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#FF5C5C]/10 text-[#FF5C5C]">
              <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
            </div>
            <div>
              <div className="font-label-md text-xs font-bold text-[#F5F3EE] flex items-center gap-2">
                <span>Disappearing Media</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#121419] text-[#E8D8B8] border border-[#272A31]">
                  {viewMode === 'timed_5'
                    ? '5s Auto-burn'
                    : viewMode === 'timed_10'
                    ? '10s Auto-burn'
                    : viewMode === 'timed_30'
                    ? '30s Auto-burn'
                    : viewMode === 'timed_60'
                    ? '60s Auto-burn'
                    : 'View Once'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {duration > 0 && (
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#E8D8B8] bg-[#121419] px-2.5 py-1 rounded-full border border-[#272A31]">
                <span className="material-symbols-outlined text-[13px]">timer</span>
                <span>00:{String(timeLeft).padStart(2, '0')}</span>
              </div>
            )}
            <button
              onClick={handleClose}
              id="close-photo-modal-btn"
              className="w-7 h-7 rounded-full bg-[#121419] flex items-center justify-center text-[#9B9DA3] hover:text-[#F5F3EE] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        {/* Progress Bar for timed */}
        {duration > 0 && (
          <div className="w-full h-1 bg-[#181B21]">
            <div
              className="h-full bg-[#E8D8B8] transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Image Content */}
        <div className="p-4 flex-1 flex items-center justify-center bg-[#0B0C0F] overflow-hidden min-h-[280px]">
          {message.mediaReference ? (
            <img
              src={message.mediaReference}
              alt="Confidential disappearing media"
              className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg pointer-events-none"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center text-[#9B9DA3] text-xs py-12">
              <span className="material-symbols-outlined text-[28px] text-[#FF5C5C] mb-2 block">warning</span>
              Photo has expired or already burned.
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-5 py-3 bg-[#181B21] border-t border-[#272A31] font-body-sm text-xs text-[#9B9DA3] text-center flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-[#E8D8B8]">visibility_off</span>
          <span>Closing this viewer will permanently erase the image.</span>
        </div>
      </div>
    </div>
  );
};
