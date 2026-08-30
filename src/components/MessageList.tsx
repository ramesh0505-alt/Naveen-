import React, { useState } from 'react';
import type { MessageItem, MemberRole } from '../types';
import { NetworkSettings } from '../utils/network';
import { MessageItemRow } from './MessageItemRow';
import { triggerHaptic } from '../utils/helpers';

interface MessageListProps {
  messages: MessageItem[];
  role: MemberRole;
  now: number;
  revealedMessageIds: Set<string>;
  networkSettings?: NetworkSettings;
  isOtherTyping?: boolean;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  onRevealMessage: (msg: MessageItem) => void;
  onSelectPhoto: (msg: MessageItem) => void;
  onViewMessage?: (messageId: string) => Promise<void>;
  onReplyToMessage: (msg: MessageItem) => void;
}

export const isMessageExpired = (msg: MessageItem, now: number): boolean => {
  if (msg.isBurned) return true;
  if (typeof msg.expiresAt === 'number' && msg.expiresAt <= now) return true;
  if (
    msg.burnOnRead &&
    msg.viewedAt &&
    typeof msg.burnAfterSeconds === 'number' &&
    msg.burnAfterSeconds > 0 &&
    msg.viewedAt + msg.burnAfterSeconds * 1000 <= now
  ) {
    return true;
  }
  if (
    !msg.burnOnRead &&
    typeof msg.burnAfterSeconds === 'number' &&
    msg.burnAfterSeconds > 0 &&
    msg.createdAt + msg.burnAfterSeconds * 1000 <= now
  ) {
    return true;
  }
  return false;
};

export const formatCountdown = (msg: MessageItem, now: number): string | null => {
  if (isMessageExpired(msg, now)) return null;

  if (msg.burnOnRead && !msg.viewedAt) {
    return 'Burn on Read';
  }

  const targetExpiresAt =
    typeof msg.expiresAt === 'number'
      ? msg.expiresAt
      : msg.burnOnRead && msg.viewedAt && typeof msg.burnAfterSeconds === 'number'
      ? msg.viewedAt + msg.burnAfterSeconds * 1000
      : typeof msg.burnAfterSeconds === 'number' && msg.burnAfterSeconds > 0
      ? msg.createdAt + msg.burnAfterSeconds * 1000
      : undefined;

  if (targetExpiresAt) {
    const remainingMs = targetExpiresAt - now;
    if (remainingMs <= 0) return 'Burned';
    const totalSecs = Math.ceil(remainingMs / 1000);
    if (totalSecs < 60) return `${totalSecs}s`;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins < 60) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }

  return null;
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  role,
  now,
  revealedMessageIds,
  networkSettings,
  isOtherTyping = false,
  messagesEndRef,
  onRevealMessage,
  onSelectPhoto,
  onViewMessage,
  onReplyToMessage,
}) => {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const handleNavigateToMessage = (targetMessageId: string) => {
    const targetElement = document.getElementById(`message-${targetMessageId}`);
    if (targetElement) {
      triggerHaptic('light');
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(targetMessageId);
      setTimeout(() => {
        setHighlightedMessageId((current) => (current === targetMessageId ? null : current));
      }, 1400);
    } else {
      triggerHaptic('warning');
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 select-none">
        <div className="w-12 h-12 rounded-full bg-[#1e2025] border border-white/5 flex items-center justify-center mb-3 text-[#c7c6ca] shadow-sm">
          <span className="material-symbols-outlined text-[22px]">lock</span>
        </div>
        <h3 className="font-display-sm text-xl text-[#e2e2e9] mb-1 tracking-tight">
          Private Space
        </h3>
        <p className="font-body-sm text-xs text-[#c7c6cb] max-w-xs leading-relaxed">
          Your conversation starts here. Messages and voice notes are temporary and protected by end-to-end PIN encryption.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 py-2">
      {/* Subtle Conversation Start Divider */}
      <div className="flex items-center justify-center my-1 select-none">
        <span className="text-[11px] font-mono text-[#909095] px-3 py-0.5 rounded-full bg-[#1a1b21] border border-white/5">
          Today • Encrypted Session
        </span>
      </div>

      {messages.map((msg) => (
        <MessageItemRow
          key={msg.id}
          msg={msg}
          role={role}
          now={now}
          revealedMessageIds={revealedMessageIds}
          networkSettings={networkSettings}
          isHighlighted={highlightedMessageId === msg.id}
          onRevealMessage={onRevealMessage}
          onSelectPhoto={onSelectPhoto}
          onViewMessage={onViewMessage}
          onReplyToMessage={onReplyToMessage}
          onNavigateToMessage={handleNavigateToMessage}
        />
      ))}

      {/* Typing Indicator */}
      {isOtherTyping && (
        <div className="flex justify-start mt-1">
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1e2025] border border-white/5 flex-shrink-0 flex items-center justify-center text-[#c7c6cb]">
              <span className="material-symbols-outlined text-[14px]">person</span>
            </div>
            <div className="msg-bubble-in bg-[#1e2025] border border-white/5 px-3.5 py-2.5 shadow-sm flex items-center gap-1.5 h-9">
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#ffb3af] animate-[bounce_1.4s_infinite_ease-in-out_both]"
                style={{ animationDelay: '-0.32s' }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#ffb3af] animate-[bounce_1.4s_infinite_ease-in-out_both]"
                style={{ animationDelay: '-0.16s' }}
              />
              <div className="w-1.5 h-1.5 rounded-full bg-[#ffb3af] animate-[bounce_1.4s_infinite_ease-in-out_both]" />
            </div>
          </div>
        </div>
      )}

      {messagesEndRef && <div ref={messagesEndRef} />}
    </div>
  );
};
