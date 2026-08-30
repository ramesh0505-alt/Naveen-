import React, { useState } from 'react';
import { getRoomFullUrl, copyToClipboard } from '../utils/helpers';

interface WaitingRoomViewProps {
  roomCode: string;
  pin?: string;
  expiresAt: number;
  memberCount: number;
  onProceedToChat?: () => void;
}

export const WaitingRoomView: React.FC<WaitingRoomViewProps> = ({
  roomCode,
  pin,
  expiresAt,
  memberCount,
  onProceedToChat,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const roomUrl = getRoomFullUrl(roomCode);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(roomUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyPin = async () => {
    if (!pin) return;
    const ok = await copyToClipboard(pin);
    if (ok) {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleCopyAll = async () => {
    const text = `Join my private 2-person room:\nLink: ${roomUrl}${pin ? `\nPIN: ${pin}` : ''}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-140px)] min-h-[500px] items-center justify-center p-6 sm:p-8 relative overflow-hidden animate-fade-in select-none">
      {/* Main Glassmorphic Card */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full bg-[#1e2025] rounded-[28px] p-6 sm:p-7 shadow-2xl border border-white/5 text-center">
        {/* Radar Icon */}
        <div className="relative w-16 h-16 rounded-full bg-[#111318] border border-white/5 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full bg-[#ffb3af]/10 animate-ping"></div>
          <span className="material-symbols-outlined text-[#ffb3af] text-[28px]">sensors</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111318] border border-white/5 text-xs font-label-sm text-[#ffb3af] mb-2.5">
          <span className="w-2 h-2 rounded-full bg-[#ffb3af] animate-pulse"></span>
          <span>Waiting for counterpart (1/2 connected)</span>
        </div>

        <h1 className="font-display-sm text-2xl text-[#e2e2e9] mb-1 tracking-tight">
          Private Sanctuary
        </h1>
        <p className="font-body-md text-xs text-[#c7c6cb] mb-5 max-w-xs leading-relaxed">
          Share the invite credentials. As soon as the other device connects, chat and audio calling are live.
        </p>

        {/* Credentials Box */}
        <div className="w-full space-y-2.5 mb-5 text-left">
          {/* Link */}
          <div className="p-3 bg-[#111318] rounded-xl flex items-center justify-between border border-white/5">
            <div className="min-w-0 pr-2">
              <span className="font-label-sm text-[10px] text-[#909095] uppercase tracking-wider block font-mono">
                Shareable Link
              </span>
              <span className="font-mono text-xs text-[#ffb3af] truncate block select-all">
                {roomUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              id="waiting-copy-link-btn"
              className="w-7 h-7 rounded-lg bg-[#282a2f] flex items-center justify-center text-[#e2e2e9] hover:text-[#ffb3af] transition-colors shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copiedLink ? 'done' : 'content_copy'}
              </span>
            </button>
          </div>

          {/* PIN */}
          {pin && (
            <div className="p-3 bg-[#111318] rounded-xl flex items-center justify-between border border-white/5">
              <div>
                <span className="font-label-sm text-[10px] text-[#909095] uppercase tracking-wider block font-mono">
                  Access PIN
                </span>
                <span className="font-mono text-xl font-bold tracking-[0.25em] text-[#e2e2e9] select-all">
                  {pin}
                </span>
              </div>
              <button
                onClick={handleCopyPin}
                id="waiting-copy-pin-btn"
                className="w-7 h-7 rounded-lg bg-[#282a2f] flex items-center justify-center text-[#e2e2e9] hover:text-[#ffb3af] transition-colors shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedPin ? 'done' : 'content_copy'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="w-full space-y-2.5">
          <button
            onClick={handleCopyAll}
            id="waiting-copy-all-btn"
            className="w-full py-2.5 rounded-full bg-[#111318] hover:bg-[#282a2f] text-[#ffb3af] font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copiedAll ? 'done' : 'content_copy'}
            </span>
            <span>{copiedAll ? 'Invite Copied!' : 'Copy Full Invite'}</span>
          </button>

          {onProceedToChat && (
            <button
              onClick={onProceedToChat}
              id="waiting-enter-chat-btn"
              className="w-full py-3 rounded-full bg-[#c7c6ca] hover:bg-[#e3e2e6] text-[#303034] font-label-md font-bold text-sm flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <span>Enter Chat Space</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
