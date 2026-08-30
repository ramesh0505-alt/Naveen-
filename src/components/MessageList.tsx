import React from 'react';
import type { MessageItem, MemberRole } from '../types';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { NetworkSettings, shouldDeferMediaDownload } from '../utils/network';

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
}

export const isMessageExpired = (msg: MessageItem, now: number): boolean => {
  if (msg.isBurned) return true;
  if (msg.expiresAt && msg.expiresAt <= now) return true;
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

  if (msg.expiresAt) {
    const remainingMs = msg.expiresAt - now;
    if (remainingMs <= 0) return 'Burned';
    const secs = Math.ceil(remainingMs / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  }

  if (msg.burnOnRead) {
    if (!msg.viewedAt) return 'Burn on Read';
    const durationSecs = msg.burnAfterSeconds ?? 10;
    const elapsed = Math.floor((now - msg.viewedAt) / 1000);
    const left = Math.max(0, durationSecs - elapsed);
    return left > 0 ? `${left}s` : 'Burned';
  }

  if (typeof msg.burnAfterSeconds === 'number' && msg.burnAfterSeconds > 0) {
    const elapsed = Math.floor((now - msg.createdAt) / 1000);
    const left = Math.max(0, msg.burnAfterSeconds - elapsed);
    return left > 0 ? `${left}s` : 'Burned';
  }

  return null;
};

const formatMessageTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
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
}) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 select-none">
        <div className="w-12 h-12 rounded-full bg-[#181B21] border border-[#272A31] flex items-center justify-center mb-3 text-[#E8D8B8] shadow-sm">
          <span className="material-symbols-outlined text-[22px]">lock</span>
        </div>
        <h3 className="font-editorial text-xl text-[#F5F3EE] mb-1 tracking-tight">
          Private Space
        </h3>
        <p className="font-body-sm text-xs text-[#9B9DA3] max-w-xs leading-relaxed">
          Your conversation starts here. Messages and voice notes are temporary and protected by end-to-end PIN encryption.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Subtle Conversation Start Divider */}
      <div className="flex items-center justify-center my-1 select-none">
        <span className="text-[11px] font-mono text-[#6E7179] px-3 py-0.5 rounded-full bg-[#121419] border border-[#272A31]">
          Today • Encrypted Session
        </span>
      </div>

      {messages.map((msg) => {
        const isMe = msg.senderRole === role;
        const isExpired = isMessageExpired(msg, now);
        const countdownStr = isExpired ? null : formatCountdown(msg, now);
        const timeStr = formatMessageTime(msg.createdAt);

        const isBurnOnReadLocked =
          msg.burnOnRead &&
          !isMe &&
          !isExpired &&
          !msg.viewedAt &&
          !revealedMessageIds.has(msg.id);

        return (
          <div
            key={msg.id}
            id={`message-${msg.id}`}
            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in group`}
          >
            {/* EXPIRED / BURNED CARD */}
            {isExpired ? (
              <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-[#181B21] border border-[#272A31] flex-shrink-0 flex items-center justify-center text-[#6E7179]">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                  </div>
                )}
                <div className="px-3.5 py-2 rounded-2xl bg-[#121419] border border-[#272A31] flex items-center gap-2 text-xs text-[#6E7179] font-mono select-none">
                  <span className="material-symbols-outlined text-[15px] text-[#FF5C5C]/80">lock</span>
                  <span>
                    {msg.type === 'IMAGE'
                      ? 'Image expired'
                      : msg.type === 'VOICE'
                      ? 'Voice note expired'
                      : 'Message expired'}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* ACTIVE TEXT MESSAGE */}
                {msg.type === 'TEXT' && (
                  <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-[#181B21] border border-[#272A31] flex-shrink-0 flex items-center justify-center text-[#9B9DA3]">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                      </div>
                    )}

                    {isBurnOnReadLocked ? (
                      <button
                        type="button"
                        onClick={() => onRevealMessage(msg)}
                        className="p-3.5 rounded-2xl bg-[#181B21] border border-[#E8D8B8]/30 hover:border-[#E8D8B8] text-left transition-all cursor-pointer group shadow-sm"
                      >
                        <div className="flex items-center gap-1.5 text-[#E8D8B8] font-label-md text-xs font-semibold mb-1">
                          <span className="material-symbols-outlined text-[14px]">lock</span>
                          <span>Confidential Note</span>
                        </div>
                        <div className="font-body-sm text-[12px] text-[#9B9DA3] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-[#E8D8B8]">visibility</span>
                          <span>Tap to view & start timer</span>
                        </div>
                      </button>
                    ) : (
                      <div
                        className={`px-4 py-2.5 shadow-sm transition-all ${
                          isMe
                            ? 'rounded-[18px] rounded-br-[4px] bg-[#E8D8B8] text-[#121419]'
                            : 'rounded-[18px] rounded-bl-[4px] bg-[#181B21] border border-[#272A31] text-[#F5F3EE]'
                        }`}
                      >
                        <p className="font-body-md text-[15px] leading-relaxed break-words font-normal">
                          {msg.textContent}
                        </p>

                        {/* Metadata Footer: Timestamp & Countdown */}
                        <div
                          className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] font-mono select-none ${
                            isMe ? 'text-[#121419]/70' : 'text-[#9B9DA3]'
                          }`}
                        >
                          {countdownStr && (
                            <span className={`flex items-center gap-0.5 font-bold ${isMe ? 'text-[#920418]' : 'text-[#FF5C5C]'}`}>
                              <span className="material-symbols-outlined text-[11px]">local_fire_department</span>
                              <span>{countdownStr}</span>
                            </span>
                          )}
                          <span>{timeStr}</span>
                          {isMe && <span>✓✓</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ACTIVE VOICE MESSAGE */}
                {msg.type === 'VOICE' && (
                  <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[78%]">
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-[#181B21] border border-[#272A31] flex-shrink-0 flex items-center justify-center text-[#9B9DA3]">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <VoiceMessagePlayer
                        audioSrc={msg.mediaReference}
                        duration={msg.duration}
                        isMe={isMe}
                        burnOnRead={msg.burnOnRead}
                        deferAutoDownload={
                          networkSettings ? shouldDeferMediaDownload('voice', networkSettings) && !isMe : false
                        }
                        onPlay={() => {
                          if (!isMe && msg.burnOnRead && onViewMessage) {
                            onViewMessage(msg.id);
                          }
                        }}
                      />
                      {countdownStr && (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-[#FF5C5C] font-bold mt-1 px-1">
                          <span className="material-symbols-outlined text-[11px] animate-pulse">local_fire_department</span>
                          <span>{countdownStr}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ACTIVE IMAGE MESSAGE */}
                {msg.type === 'IMAGE' && (
                  <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-[#181B21] border border-[#272A31] flex-shrink-0 flex items-center justify-center text-[#9B9DA3]">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectPhoto(msg)}
                      className="p-1.5 rounded-[20px] bg-[#181B21] border border-[#272A31] hover:border-[#E8D8B8]/60 transition-all cursor-pointer text-left shadow-sm group relative overflow-hidden"
                    >
                      <div className="relative rounded-[14px] overflow-hidden max-h-48 bg-black/40">
                        {msg.mediaReference ? (
                          <img
                            src={msg.mediaReference}
                            alt="Ephemeral Media"
                            className="w-full h-auto object-cover blur-sm group-hover:blur-none transition-all duration-300"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-44 h-28 flex items-center justify-center bg-[#121419]">
                            <span className="font-mono text-xs text-[#6E7179]">Image burned</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs group-hover:bg-black/20 transition-colors">
                          <span className="px-3 py-1 rounded-full bg-[#0B0C0F]/90 border border-[#272A31] text-xs font-mono text-[#F5F3EE] flex items-center gap-1.5 shadow-sm">
                            <span className="material-symbols-outlined text-[14px] text-[#E8D8B8]">visibility</span>
                            <span>View Photo</span>
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isOtherTyping && (
        <div className="flex justify-start mt-1">
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-[#181B21] border border-[#272A31] flex-shrink-0 flex items-center justify-center text-[#9B9DA3]">
              <span className="material-symbols-outlined text-[14px]">person</span>
            </div>
            <div className="rounded-[16px] rounded-bl-[4px] bg-[#181B21] border border-[#272A31] px-3.5 py-2.5 shadow-sm flex items-center gap-1.5 h-9">
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#E8D8B8] animate-[bounce_1.4s_infinite_ease-in-out_both]"
                style={{ animationDelay: '-0.32s' }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#E8D8B8] animate-[bounce_1.4s_infinite_ease-in-out_both]"
                style={{ animationDelay: '-0.16s' }}
              />
              <div className="w-1.5 h-1.5 rounded-full bg-[#E8D8B8] animate-[bounce_1.4s_infinite_ease-in-out_both]" />
            </div>
          </div>
        </div>
      )}

      {messagesEndRef && <div ref={messagesEndRef} />}
    </div>
  );
};
