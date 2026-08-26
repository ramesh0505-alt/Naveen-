import React, { useState, useEffect } from 'react';
import { Flame, X, Clock, Eye, AlertTriangle } from 'lucide-react';
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
    // If view once or timed, close burns the photo immediately
    onBurnPhoto(message.id);
    onClose();
  };

  const progressPercent = duration > 0 ? (timeLeft / duration) * 100 : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                <span>Disappearing Photo</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
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

          <div className="flex items-center gap-3">
            {duration > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/60">
                <Clock className="w-3.5 h-3.5" />
                <span>00:{String(timeLeft).padStart(2, '0')}</span>
              </div>
            )}
            <button
              onClick={handleClose}
              id="close-photo-modal-btn"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar for timed */}
        {duration > 0 && (
          <div className="w-full h-1 bg-zinc-800">
            <div
              className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Image Content */}
        <div className="p-4 flex-1 flex items-center justify-center bg-black/60 overflow-hidden min-h-[300px]">
          {message.mediaReference ? (
            <img
              src={message.mediaReference}
              alt="Confidential disappearing media"
              className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg pointer-events-none"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center text-zinc-500 text-xs py-12">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              Photo has expired or already burned.
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          <span>Closing this viewer will permanently delete the image.</span>
        </div>
      </div>
    </div>
  );
};
