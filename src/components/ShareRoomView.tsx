import React, { useState } from 'react';
import { getRoomFullUrl, copyToClipboard, formatTimeRemaining } from '../utils/helpers';

interface ShareRoomViewProps {
  roomCode: string;
  pin: string;
  expiresAt: number;
  onEnterRoom: () => void;
}

export const ShareRoomView: React.FC<ShareRoomViewProps> = ({
  roomCode,
  pin,
  expiresAt,
  onEnterRoom,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const roomUrl = getRoomFullUrl(roomCode);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(roomUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyPin = async () => {
    const ok = await copyToClipboard(pin);
    if (ok) {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleCopyFull = async () => {
    const text = `Join my private 2-person room:\nLink: ${roomUrl}\nPIN: ${pin}\n(Expires in ${formatTimeRemaining(expiresAt)})`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Private Room Invite',
          text: `Join my private 2-person space.\nPIN: ${pin}`,
          url: roomUrl,
        });
      } catch {}
    } else {
      handleCopyFull();
    }
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-140px)] min-h-[500px] items-center justify-center p-6 sm:p-8 relative overflow-hidden animate-fade-in select-none">
      {/* Main Glassmorphic Card */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full bg-[#121419] rounded-[28px] p-6 sm:p-7 shadow-2xl border border-[#272A31] text-center">
        {/* Top Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[#181B21] border border-[#272A31] shadow-lg flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[#E8D8B8] text-[26px]">lock</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181B21] border border-[#272A31] text-xs font-label-sm text-[#7ED6A5] mb-2.5">
          <span className="material-symbols-outlined text-[15px]">verified_user</span>
          <span>Room Established</span>
        </div>

        <h1 className="font-editorial text-2xl text-[#F5F3EE] mb-1 tracking-tight">
          Ready for Connection
        </h1>
        <p className="font-body-sm text-xs text-[#9B9DA3] mb-5 max-w-xs leading-relaxed">
          Share these credentials with your counterpart. Once the session terminates, all history disappears.
        </p>

        {/* Credentials */}
        <div className="w-full space-y-2.5 mb-5 text-left">
          {/* Link */}
          <div className="w-full bg-[#181B21] rounded-xl p-3 border border-[#272A31]">
            <span className="font-label-sm text-[10px] text-[#9B9DA3] mb-1 block uppercase tracking-wider font-mono">
              Shareable Link
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#E8D8B8] truncate select-all">
                {roomUrl.replace(/^https?:\/\//, '')}
              </span>
              <button
                onClick={handleCopyLink}
                id="share-copy-link-btn"
                className="w-7 h-7 rounded-lg bg-[#272A31] flex items-center justify-center text-[#F5F3EE] hover:text-[#E8D8B8] transition-colors shrink-0 cursor-pointer"
                title="Copy Link"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedLink ? 'done' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>

          {/* PIN */}
          <div className="w-full bg-[#181B21] rounded-xl p-3 border border-[#272A31]">
            <span className="font-label-sm text-[10px] text-[#9B9DA3] mb-1 block uppercase tracking-wider font-mono">
              Access PIN
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xl font-bold tracking-[0.25em] text-[#F5F3EE] select-all">
                {pin}
              </span>
              <button
                onClick={handleCopyPin}
                id="share-copy-pin-btn"
                className="w-7 h-7 rounded-lg bg-[#272A31] flex items-center justify-center text-[#F5F3EE] hover:text-[#E8D8B8] transition-colors shrink-0 cursor-pointer"
                title="Copy PIN"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedPin ? 'done' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            onClick={onEnterRoom}
            id="share-enter-room-btn"
            className="w-full py-3 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-[#F0E3C8] transition-all cursor-pointer active:scale-98"
          >
            <span>Enter Room</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>

          <button
            onClick={handleShare}
            id="share-system-btn"
            className="w-full py-2.5 rounded-full bg-[#181B21] hover:bg-[#272A31] text-[#E8D8B8] font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#272A31] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
            <span>Share Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};
