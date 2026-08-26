import React, { useState } from 'react';
import { Shield, Copy, Check, Users, KeyRound, Link as LinkIcon, Radio, Share2, ArrowRight } from 'lucide-react';
import { getRoomFullUrl, copyToClipboard, formatTimeRemaining } from '../utils/helpers';

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
    <div className="flex flex-col w-full h-[calc(100vh-140px)] min-h-[500px] items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-[#0b1326] animate-fade-in font-sans">
      {/* Ambient Pulsing Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
        <div className="w-[360px] h-[360px] bg-[#4d8eff]/20 rounded-full blur-[90px] animate-pulse"></div>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full bg-[#131b2e]/85 backdrop-blur-3xl rounded-[32px] p-7 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/5 text-center">
        {/* Radar Icon */}
        <div className="relative w-20 h-20 rounded-full bg-[#171f33] border border-white/10 flex items-center justify-center mb-5 shadow-inner">
          <div className="absolute inset-0 rounded-full bg-[#4d8eff]/10 animate-ping"></div>
          <Radio className="w-8 h-8 text-[#adc6ff] animate-pulse" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4d8eff]/15 text-[#adc6ff] border border-[#4d8eff]/30 text-xs font-mono mb-3">
          <span className="w-2 h-2 rounded-full bg-[#adc6ff] animate-pulse"></span>
          <span>Waiting for second participant</span>
        </div>

        <h1 className="text-2xl font-semibold text-[#dae2fd] mb-1 tracking-tight">
          Private Room
        </h1>
        <p className="text-xs text-[#c2c6d6] mb-6 max-w-[260px] leading-relaxed">
          Share the secure credentials below to initiate your 2-person session.
        </p>

        {/* Credentials Box */}
        <div className="w-full space-y-3 mb-6 text-left font-mono">
          {/* Link */}
          <div className="p-3.5 bg-[#222a3d] rounded-2xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] text-[#8c909f] uppercase tracking-wider block">
                Secure Link
              </span>
              <span className="text-xs text-[#dae2fd] truncate block select-all">
                {roomUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              id="waiting-copy-link-btn"
              className="w-8 h-8 rounded-full bg-[#2d3449] flex items-center justify-center text-[#dae2fd] hover:text-[#adc6ff] transition-colors shrink-0 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#adc6ff]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* PIN */}
          {pin && (
            <div className="p-3.5 bg-[#222a3d] rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8c909f] uppercase tracking-wider block">
                  Access PIN
                </span>
                <span className="text-xl font-bold tracking-widest text-[#adc6ff] select-all">
                  {pin}
                </span>
              </div>
              <button
                onClick={handleCopyPin}
                id="waiting-copy-pin-btn"
                className="w-8 h-8 rounded-full bg-[#2d3449] flex items-center justify-center text-[#dae2fd] hover:text-[#adc6ff] transition-colors shrink-0 cursor-pointer"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-[#adc6ff]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="w-full space-y-2.5">
          <button
            onClick={handleCopyAll}
            id="waiting-copy-all-btn"
            className="w-full py-3.5 rounded-full bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] text-xs font-semibold flex items-center justify-center gap-2 border border-white/5 transition-colors cursor-pointer"
          >
            {copiedAll ? <Check className="w-4 h-4 text-[#adc6ff]" /> : <Copy className="w-4 h-4 text-[#adc6ff]" />}
            <span>{copiedAll ? 'Invite Copied!' : 'Copy Full Invite'}</span>
          </button>

          {onProceedToChat && (
            <button
              onClick={onProceedToChat}
              id="waiting-enter-chat-btn"
              className="w-full py-3.5 rounded-full bg-[#adc6ff] text-[#002e6a] font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(173,198,255,0.25)] hover:bg-[#adc6ff]/90 transition-colors cursor-pointer"
            >
              <span>Enter Chat Space</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
