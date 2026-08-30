import React, { useState } from 'react';
import type { RoomInfo, MemberRole } from '../types';
import {
  formatAbsoluteDateTime,
  formatDetailedTimeRemaining,
  copyToClipboard,
  getRoomFullUrl,
  triggerHaptic,
} from '../utils/helpers';

interface RoomInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomInfo: RoomInfo;
  role: MemberRole;
  pin?: string;
  now: number;
  otherUserOnline: boolean;
  onOpenTimerModal?: () => void;
}

export const RoomInfoModal: React.FC<RoomInfoModalProps> = ({
  isOpen,
  onClose,
  roomInfo,
  role,
  pin,
  now,
  otherUserOnline,
  onOpenTimerModal,
}) => {
  const [showPin, setShowPin] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(roomInfo.roomCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
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

  const handleCopyLink = async () => {
    const url = getRoomFullUrl(roomInfo.roomCode, pin);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getTimerPolicyLabel = (val?: number) => {
    if (val === -1) return { label: 'Burn on Read (10s)', desc: 'Messages self-destruct 10s after recipient opens/views', icon: 'local_fire_department', color: 'text-[#ffb4ab]' };
    if (val === 10) return { label: '10 Seconds', desc: 'Auto-burns 10s after sending', icon: 'bolt', color: 'text-[#ffb3af]' };
    if (val === 30) return { label: '30 Seconds', desc: 'Auto-burns 30s after sending', icon: 'bolt', color: 'text-[#ffb3af]' };
    if (val === 60) return { label: '1 Minute', desc: 'Auto-burns 60s after sending', icon: 'bolt', color: 'text-[#ffb3af]' };
    if (val === 300) return { label: '5 Minutes', desc: 'Auto-burns 5m after sending', icon: 'schedule', color: 'text-[#c7c6cb]' };
    if (val === 3600) return { label: '1 Hour', desc: 'Auto-burns 1h after sending', icon: 'schedule', color: 'text-[#c7c6cb]' };
    if (val === 86400) return { label: '24 Hours', desc: 'Standard 24-hour retention', icon: 'schedule', color: 'text-[#c7c6cb]' };
    return { label: 'Room Lifetime', desc: 'Persists until the private room expires or is closed', icon: 'hourglass_top', color: 'text-[#ffb3af]' };
  };

  const timerPolicy = getTimerPolicyLabel(roomInfo.defaultMessageExpiration);
  const remainingTimeStr = formatDetailedTimeRemaining(roomInfo.expiresAt, now);
  const isRoomExpired = roomInfo.expiresAt <= now;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#111318]/90 backdrop-blur-2xl animate-fade-in font-sans select-none">
      <div
        id="room-info-modal"
        className="w-full max-w-md bg-[#1e2025] border border-white/5 shadow-2xl p-5 sm:p-6 text-[#e2e2e9] rounded-[28px] animate-scale-up relative overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle Ambient Accent Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#ffb3af]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#111318] border border-white/5 flex items-center justify-center text-[#ffb3af] shadow-sm">
              <span className="material-symbols-outlined text-[20px]">info</span>
            </div>
            <div>
              <h3 className="font-display-sm text-base sm:text-lg font-bold text-[#e2e2e9] tracking-tight">
                Room Information
              </h3>
              <p className="font-mono text-[11px] text-[#c7c6cb]">
                Server-Authoritative State &amp; Security
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            id="close-room-info-modal-btn"
            className="w-8 h-8 rounded-full bg-[#111318] border border-white/5 flex items-center justify-center text-[#c7c6cb] hover:text-[#e2e2e9] hover:bg-[#282a2f] active:scale-95 transition-all cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-0.5">
          {/* Server-Authoritative Room Expiration Card */}
          <div className="p-3.5 bg-[#111318] rounded-2xl border border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ffb3af] font-mono uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">timer</span>
                <span>Room Expiration (Server Sync)</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e2025] text-[#c7c6cb] border border-white/5">
                <span className={`w-1.5 h-1.5 rounded-full ${isRoomExpired ? 'bg-[#ffb4ab]' : 'bg-[#ffb3af] animate-pulse'}`} />
                <span>{isRoomExpired ? 'Expired' : 'Active'}</span>
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-mono font-bold text-[#e2e2e9] tracking-tight mb-1">
              {remainingTimeStr}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/5 text-[11px] font-mono">
              <div>
                <span className="text-[#909095] block">Server Expiry Timestamp:</span>
                <span className="text-[#e2e2e9] font-medium block mt-0.5">
                  {formatAbsoluteDateTime(roomInfo.expiresAt)}
                </span>
              </div>
              {roomInfo.createdAt > 0 && (
                <div>
                  <span className="text-[#909095] block">Created At:</span>
                  <span className="text-[#c7c6cb] font-medium block mt-0.5">
                    {formatAbsoluteDateTime(roomInfo.createdAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Access Credentials & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Room Code */}
            <div className="p-3 bg-[#111318] rounded-2xl border border-white/5 flex flex-col justify-between">
              <div className="text-[10px] text-[#909095] font-mono uppercase tracking-wider mb-1">
                Room Code
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-base font-mono font-bold text-[#e2e2e9] tracking-wider truncate">
                  {roomInfo.roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  id="copy-room-code-info-btn"
                  className="p-1.5 rounded-lg bg-[#1e2025] hover:bg-[#282a2f] text-[#c7c6cb] hover:text-[#ffb3af] transition-colors cursor-pointer flex-shrink-0"
                  title="Copy Room Code"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copiedCode ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* Access PIN */}
            <div className="p-3 bg-[#111318] rounded-2xl border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#909095] font-mono uppercase tracking-wider mb-1">
                <span>Access PIN</span>
                {pin && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setShowPin(!showPin);
                    }}
                    className="text-[10px] text-[#c7c6cb] hover:text-[#ffb3af] underline cursor-pointer"
                  >
                    {showPin ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-base font-mono font-bold text-[#ffb3af] tracking-widest truncate">
                  {pin ? (showPin ? pin : '••••••') : 'Encrypted PIN'}
                </span>
                {pin && (
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    id="copy-room-pin-info-btn"
                    className="p-1.5 rounded-lg bg-[#1e2025] hover:bg-[#282a2f] text-[#c7c6cb] hover:text-[#ffb3af] transition-colors cursor-pointer flex-shrink-0"
                    title="Copy PIN"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copiedPin ? 'check' : 'content_copy'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Session Role & Peer Connection Status */}
          <div className="p-3 bg-[#111318] rounded-2xl border border-white/5 space-y-2">
            <div className="text-[10px] text-[#909095] font-mono uppercase tracking-wider">
              Session Participants
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1e2025] border border-white/5 flex items-center justify-center text-[#ffb3af]">
                  <span className="material-symbols-outlined text-[13px]">person</span>
                </div>
                <div>
                  <span className="text-[#e2e2e9] font-medium block">Your Role</span>
                  <span className="text-[#c7c6cb] text-[10px]">
                    {role === 'owner' ? 'Room Host / Creator' : 'Invited Guest'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e2025] border border-white/5 text-[#ffb3af] uppercase">
                {role}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1e2025] border border-white/5 flex items-center justify-center text-[#c7c6cb]">
                  <span className="material-symbols-outlined text-[13px]">group</span>
                </div>
                <div>
                  <span className="text-[#e2e2e9] font-medium block">Peer Connection</span>
                  <span className="text-[#c7c6cb] text-[10px]">
                    {otherUserOnline ? 'Synchronized & Online' : 'Waiting for peer...'}
                  </span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${otherUserOnline ? 'bg-[#ffb3af]/15 border-[#ffb3af]/30 text-[#ffb3af]' : 'bg-[#1e2025] border-white/5 text-[#909095]'}`}>
                {otherUserOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Synchronized Disappearing Messages Policy */}
          <div className="p-3 bg-[#111318] rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] text-[#909095] font-mono uppercase tracking-wider">
                Default Message Retention
              </div>
              {onOpenTimerModal && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenTimerModal();
                  }}
                  className="text-[10px] text-[#ffb3af] hover:underline font-mono cursor-pointer"
                >
                  Change Timer
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full bg-[#1e2025] border border-white/5 flex items-center justify-center ${timerPolicy.color}`}>
                <span className="material-symbols-outlined text-[16px]">{timerPolicy.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#e2e2e9] font-mono">
                  {timerPolicy.label}
                </div>
                <div className="text-[10px] text-[#c7c6cb] leading-snug">
                  {timerPolicy.desc}
                </div>
              </div>
            </div>
          </div>

          {/* Ephemeral Architecture Note */}
          <div className="px-3 py-2 rounded-xl bg-[#1e2025] border border-white/5 text-[10px] font-mono text-[#909095] flex items-center gap-2 leading-tight">
            <span className="material-symbols-outlined text-[15px] text-[#ffb3af] flex-shrink-0">verified_user</span>
            <span>
              Zero persistent logs. All message keys and media are purged on server expiry timestamp.
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-white/5 flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            id="copy-invite-link-btn"
            className="flex-1 py-3 rounded-full bg-[#111318] hover:bg-[#282a2f] active:scale-95 text-[#ffb3af] border border-white/5 text-xs font-mono font-semibold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copiedLink ? 'check' : 'share'}
            </span>
            <span>{copiedLink ? 'Link Copied' : 'Copy Invite Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            id="done-room-info-btn"
            className="py-3 px-6 rounded-full bg-[#c7c6ca] hover:bg-[#e3e2e6] active:scale-95 text-[#303034] text-xs font-mono font-bold transition-all cursor-pointer min-h-[44px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
