import React, { useState } from 'react';
import { Copy, Check, Share2, ArrowRight, Link as LinkIcon, AlertCircle } from 'lucide-react';
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
          title: 'Private 2P Room Invite',
          text: `Join my private 2-person room on Private Messenger.\nPIN: ${pin}`,
          url: roomUrl,
        });
      } catch {}
    } else {
      handleCopyFull();
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 animate-fade-in font-sans">
      <div className="bg-[#141414] border border-[#2A2A2A] shadow-2xl overflow-hidden text-[#F0F0F0]">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-[#2A2A2A] text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#888] font-mono">
              Key Generation Complete
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#666] font-mono border border-[#2A2A2A] px-2 py-0.5">
              ROOM_{roomCode}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight mb-2">
            Private Channel <span className="font-serif italic text-[#CCC]">Ready</span>
          </h1>
          <p className="text-xs text-[#888] font-light leading-relaxed">
            Transmit this URL and one-time access PIN to your peer. Space capacity is capped at 02 participants.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Room Link */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2 font-mono flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" /> 01 // Direct URL
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#0E0E0E] border border-[#2A2A2A] px-4 py-3 text-xs font-mono text-[#E0E0E0] truncate select-all">
                {roomUrl}
              </div>
              <button
                onClick={handleCopyLink}
                id="copy-link-btn"
                className="px-4 py-3 bg-[#1C1C1C] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[#F0F0F0] font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* 6-Digit PIN Display */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2 font-mono">
              02 // Salted Access PIN
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#0E0E0E] border border-[#2A2A2A] p-3 flex items-center justify-between">
                <div className="flex gap-2 sm:gap-3 mx-auto">
                  {pin.split('').map((char, index) => (
                    <span
                      key={index}
                      className="w-8 h-10 sm:w-10 sm:h-12 bg-[#1A1A1A] border border-[#333] flex items-center justify-center font-mono text-lg sm:text-xl font-light text-white tracking-widest"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCopyPin}
                id="copy-pin-btn"
                className="px-4 py-3 bg-[#1C1C1C] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[#F0F0F0] font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer self-stretch"
                title="Copy PIN"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPin ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleCopyFull}
              id="copy-full-invite-btn"
              className="px-4 py-3 border border-[#2A2A2A] hover:border-[#444] bg-[#0E0E0E] text-[#CCC] font-mono text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFull ? 'Copied' : 'Copy Full Invite'}</span>
            </button>

            <button
              onClick={handleShare}
              id="device-share-btn"
              className="px-4 py-3 border border-[#2A2A2A] hover:border-[#444] bg-[#0E0E0E] text-[#CCC] font-mono text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#888]" />
              <span>System Share</span>
            </button>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2.5 p-3.5 bg-[#121212] border border-[#222] text-[11px] text-[#888] font-mono">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>
              Once 2 participants connect, the access token is sealed and further attempts are rejected.
            </span>
          </div>

          {/* Enter Room Button */}
          <button
            onClick={onEnterRoom}
            id="enter-room-btn"
            className="w-full py-4 bg-white text-black text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-[#D1D1D1] transition-all flex items-center justify-center gap-3 cursor-pointer mt-2"
          >
            <span>Enter Private Room</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
