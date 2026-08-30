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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111318]/95 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-[#1e2025] rounded-[24px] border border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between bg-[#111318]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#93000a]/20 text-[#ffb4ab]">
              <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
            </div>
            <div>
              <div className="font-label-md text-xs font-bold text-[#e2e2e9] flex items-center gap-2">
                <span>Disappearing Media</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#1e2025] text-[#ffb3af] border border-white/5">
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
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#ffb3af] bg-[#1e2025] px-2.5 py-1 rounded-full border border-white/5">
                <span className="material-symbols-outlined text-[13px]">timer</span>
                <span>00:{String(timeLeft).padStart(2, '0')}</span>
              </div>
            )}
            <button
              onClick={handleClose}
              id="close-photo-modal-btn"
              className="w-7 h-7 rounded-full bg-[#1e2025] flex items-center justify-center text-[#c7c6cb] hover:text-[#e2e2e9] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        {/* Progress Bar for timed */}
        {duration > 0 && (
          <div className="w-full h-1 bg-[#111318]">
            <div
              className="h-full bg-[#ffb3af] transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Image Content */}
        <div className="p-4 flex-1 flex items-center justify-center bg-[#111318] overflow-hidden min-h-[280px]">
          {message.mediaReference ? (
            <img
              src={message.mediaReference}
              alt="Confidential disappearing media"
              className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg pointer-events-none"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center text-[#909095] text-xs py-12">
              <span className="material-symbols-outlined text-[28px] text-[#ffb4ab] mb-2 block">warning</span>
              Photo has expired or already burned.
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-5 py-3 bg-[#111318] border-t border-white/5 font-body-md text-xs text-[#c7c6cb] text-center flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-[#ffb3af]">visibility_off</span>
          <span>Closing this viewer will permanently erase the image.</span>
        </div>
      </div>
    </div>
  );
};
