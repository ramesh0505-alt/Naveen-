import React, { useState } from 'react';
import { Copy, Check, Share2, ArrowRight, Link as LinkIcon, ShieldCheck, Lock } from 'lucide-react';
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
    <div className="flex flex-col w-full h-[calc(100vh-140px)] min-h-[500px] items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-[#0b1326] animate-fade-in font-sans">
      {/* Ambient Pulsing Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
        <div className="w-[360px] h-[360px] bg-[#4d8eff]/20 rounded-full blur-[90px] animate-pulse"></div>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full bg-[#131b2e]/85 backdrop-blur-3xl rounded-[32px] p-7 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/5 text-center">
        {/* Top Icon */}
        <div className="w-16 h-16 rounded-full bg-[#4d8eff]/20 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(77,142,255,0.2)]">
          <Lock className="w-8 h-8 text-[#adc6ff]" />
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[#4d8eff]/15 border border-[#4d8eff]/30 px-3.5 py-1.5 rounded-full mb-3">
          <ShieldCheck className="w-4 h-4 text-[#adc6ff]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#adc6ff]">
            Room Established
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-[#dae2fd] mb-1 tracking-tight">
          Ready for connection.
        </h1>
        <p className="text-xs text-[#c2c6d6] mb-6 max-w-[260px] leading-relaxed">
          Share these credentials with your partner. The room closes once session expires.
        </p>

        {/* Credentials */}
        <div className="w-full space-y-3 mb-6 text-left">
          {/* Link */}
          <div className="w-full bg-[#222a3d] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#c2c6d6] mb-1 block uppercase tracking-wider">
              Secure Link
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-[#dae2fd] truncate select-all">
                {roomUrl.replace(/^https?:\/\//, '')}
              </span>
              <button
                onClick={handleCopyLink}
                id="share-copy-link-btn"
                className="w-8 h-8 rounded-full bg-[#2d3449] flex items-center justify-center text-[#dae2fd] hover:text-[#adc6ff] transition-colors shrink-0 cursor-pointer"
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-[#adc6ff]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* PIN */}
          <div className="w-full bg-[#222a3d] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#c2c6d6] mb-1 block uppercase tracking-wider">
              Access PIN
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-mono font-bold tracking-widest text-[#adc6ff] select-all">
                {pin}
              </span>
              <button
                onClick={handleCopyPin}
                id="share-copy-pin-btn"
                className="w-8 h-8 rounded-full bg-[#2d3449] flex items-center justify-center text-[#dae2fd] hover:text-[#adc6ff] transition-colors shrink-0 cursor-pointer"
                title="Copy PIN"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-[#adc6ff]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            onClick={onEnterRoom}
            id="share-enter-room-btn"
            className="w-full py-3.5 rounded-full bg-[#adc6ff] text-[#002e6a] font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(173,198,255,0.25)] hover:bg-[#adc6ff]/90 transition-all cursor-pointer active:scale-98"
          >
            <span>Enter Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleShare}
            id="share-system-btn"
            className="w-full py-3 rounded-full bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] text-xs font-semibold flex items-center justify-center gap-2 border border-white/5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#adc6ff]" />
            <span>Share Invite</span>
          </button>
        </div>
      </div>
    </div>
  );
};
