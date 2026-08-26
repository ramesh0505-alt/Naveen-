import React, { useState } from 'react';
import { Shield, Copy, Check, Users, KeyRound, Link as LinkIcon, Radio, Share2 } from 'lucide-react';
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
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden text-center">
        {/* Radar Waiting Animation */}
        <div className="p-8 sm:p-12 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 relative overflow-hidden">
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 animate-ping"></div>
            <div className="absolute inset-3 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 animate-pulse"></div>
            <div className="w-16 h-16 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-lg relative z-10">
              <Radio className="w-8 h-8 text-emerald-400 dark:text-emerald-600 animate-pulse" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Waiting for second participant
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">
            Private Room
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto mb-6">
            Waiting for the other person to join with their PIN...
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <Users className="w-4 h-4 text-zinc-500" />
            <span>{memberCount} / 2 Connected</span>
          </div>
        </div>

        {/* Room Credentials Card */}
        <div className="p-6 sm:p-8 space-y-5 text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Share Details
          </h3>

          {/* Link */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="min-w-0 pr-3">
              <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                <LinkIcon className="w-3 h-3" /> Private Link
              </div>
              <div className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {roomUrl}
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              id="waiting-copy-link-btn"
              className="p-2 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex-shrink-0"
              title="Copy Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* PIN if available */}
          {pin && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                  <KeyRound className="w-3 h-3" /> 6-Digit PIN
                </div>
                <div className="text-lg font-mono font-bold tracking-widest text-zinc-900 dark:text-zinc-100">
                  {pin}
                </div>
              </div>
              <button
                onClick={handleCopyPin}
                id="waiting-copy-pin-btn"
                className="p-2 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex-shrink-0"
                title="Copy PIN"
              >
                {copiedPin ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopyAll}
              id="waiting-copy-all-btn"
              className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? 'Invite Copied!' : 'Copy Full Invite'}</span>
            </button>

            {onProceedToChat && (
              <button
                onClick={onProceedToChat}
                className="flex-1 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <span>Open Chat Screen</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
