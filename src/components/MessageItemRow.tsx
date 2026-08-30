import React, { useState, useRef, useEffect } from 'react';
import type { MessageItem, MemberRole } from '../types';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { NetworkSettings, shouldDeferMediaDownload } from '../utils/network';
import { isMessageExpired, formatCountdown } from './MessageList';
import { triggerHaptic } from '../utils/helpers';

interface MessageItemRowProps {
  msg: MessageItem;
  role: MemberRole;
  now: number;
  revealedMessageIds: Set<string>;
  networkSettings?: NetworkSettings;
  isHighlighted?: boolean;
  onRevealMessage: (msg: MessageItem) => void;
  onSelectPhoto: (msg: MessageItem) => void;
  onViewMessage?: (messageId: string) => Promise<void>;
  onReplyToMessage: (msg: MessageItem) => void;
  onNavigateToMessage: (targetMessageId: string) => void;
}

const formatMessageTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
};

export const MessageItemRow: React.FC<MessageItemRowProps> = ({
  msg,
  role,
  now,
  revealedMessageIds,
  networkSettings,
  isHighlighted = false,
  onRevealMessage,
  onSelectPhoto,
  onViewMessage,
  onReplyToMessage,
  onNavigateToMessage,
}) => {
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

  // Swipe-to-reply gesture tracking
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const hasTriggeredHapticRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<any>(null);

  const SWIPE_THRESHOLD = 50;
  const MAX_SWIPE = 85;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExpired) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isHorizontalSwipeRef.current = null;
    hasTriggeredHapticRef.current = false;

    // Start long press timer for mobile context menu
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic('medium');
      setShowContextMenu(true);
    }, 550);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || isExpired) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartPosRef.current.x;
    const deltaY = touch.clientY - touchStartPosRef.current.y;

    // Cancel long press if finger moved
    if (Math.hypot(deltaX, deltaY) > 10 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > Math.abs(deltaY) + 6 && Math.abs(deltaX) > 8) {
        isHorizontalSwipeRef.current = true;
        setIsSwiping(true);
      } else if (Math.abs(deltaY) > 8) {
        isHorizontalSwipeRef.current = false;
      }
    }

    if (isHorizontalSwipeRef.current) {
      // Swiping right to trigger reply
      if (deltaX > 0) {
        const rubberBand = Math.min(MAX_SWIPE, deltaX * 0.55);
        setDragOffset(rubberBand);

        if (rubberBand >= SWIPE_THRESHOLD && !hasTriggeredHapticRef.current) {
          triggerHaptic('medium');
          hasTriggeredHapticRef.current = true;
        } else if (rubberBand < SWIPE_THRESHOLD && hasTriggeredHapticRef.current) {
          hasTriggeredHapticRef.current = false;
        }
      } else {
        setDragOffset(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isHorizontalSwipeRef.current && dragOffset >= SWIPE_THRESHOLD && !isExpired) {
      triggerHaptic('impact');
      onReplyToMessage(msg);
    }

    setDragOffset(0);
    setIsSwiping(false);
    touchStartPosRef.current = null;
    isHorizontalSwipeRef.current = null;
    hasTriggeredHapticRef.current = false;
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setDragOffset(0);
    setIsSwiping(false);
    touchStartPosRef.current = null;
    isHorizontalSwipeRef.current = null;
    hasTriggeredHapticRef.current = false;
  };

  const handleCopyText = async () => {
    if (msg.textContent) {
      try {
        await navigator.clipboard.writeText(msg.textContent);
        triggerHaptic('light');
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      } catch {}
    }
    setShowContextMenu(false);
  };

  const handleReplyAction = () => {
    triggerHaptic('light');
    setShowContextMenu(false);
    onReplyToMessage(msg);
  };

  // Close context menu on global click or Esc
  useEffect(() => {
    if (!showContextMenu) return;
    const handleGlobalClick = () => setShowContextMenu(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowContextMenu(false);
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showContextMenu]);

  // Reply Quoted Preview Details
  const replyPreview = msg.replyPreview;
  const hasReply = Boolean(msg.replyToMessageId);
  const isReplySenderMe = replyPreview ? replyPreview.senderRole === role : false;

  return (
    <div
      id={`message-${msg.id}`}
      className={`flex flex-col relative ${
        isMe ? 'items-end' : 'items-start'
      } animate-fade-in group py-0.5 select-none`}
    >
      {/* Swipe Indicator Icon (appears when dragging horizontally) */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-opacity duration-150"
        style={{
          opacity: isSwiping ? Math.min(1, dragOffset / SWIPE_THRESHOLD) : 0,
          transform: `translateX(${Math.max(0, dragOffset - 36)}px) scale(${
            dragOffset >= SWIPE_THRESHOLD ? 1.15 : 0.9
          })`,
          transition: isSwiping ? 'none' : 'all 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            dragOffset >= SWIPE_THRESHOLD
              ? 'bg-[#ffb3af] text-[#111318]'
              : 'bg-[#1e2025] text-[#c7c6cb] border border-white/10'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">reply</span>
        </div>
      </div>

      {/* Main Message Bubble with Smooth Swipe Transform */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onContextMenu={(e) => {
          if (!isExpired) {
            e.preventDefault();
            setShowContextMenu(true);
          }
        }}
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
        className={`relative max-w-[88%] sm:max-w-[78%] transition-shadow duration-500 ${
          isHighlighted
            ? 'ring-2 ring-[#ffb3af] shadow-[0_0_22px_rgba(255,179,175,0.45)] rounded-2xl'
            : ''
        }`}
      >
        {/* Desktop Quick Action Pill on Hover */}
        {!isExpired && (
          <div
            className={`absolute top-0 -translate-y-1/2 ${
              isMe ? 'left-0 -translate-x-full -ml-2' : 'right-0 translate-x-full -mr-2'
            } hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150 z-20`}
          >
            <div className="px-1.5 py-1 rounded-full bg-[#181B21]/95 backdrop-blur-md border border-[#272A31] shadow-xl flex items-center gap-1">
              <button
                type="button"
                onClick={handleReplyAction}
                title="Reply"
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#c7c6cb] hover:text-[#ffb3af] hover:bg-[#272A31] active:scale-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">reply</span>
              </button>
              {msg.type === 'TEXT' && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  title="Copy text"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#c7c6cb] hover:text-[#F5F3EE] hover:bg-[#272A31] active:scale-90 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContextMenu(!showContextMenu);
                }}
                title="More"
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#9B9DA3] hover:text-[#F5F3EE] hover:bg-[#272A31] active:scale-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">more_vert</span>
              </button>
            </div>
          </div>
        )}

        {/* Message Context Dropdown */}
        {showContextMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-2 ${
              isMe ? 'right-0' : 'left-0'
            } z-50 w-44 py-1.5 rounded-2xl bg-[#121419] border border-[#272A31] shadow-2xl animate-scale-up font-sans`}
          >
            <button
              type="button"
              onClick={handleReplyAction}
              className="w-full px-3.5 py-2 text-xs text-left text-[#F5F3EE] hover:bg-[#181B21] flex items-center gap-2.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[#ffb3af] text-[16px]">reply</span>
              <span>Reply</span>
            </button>

            {msg.type === 'TEXT' && msg.textContent && (
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full px-3.5 py-2 text-xs text-left text-[#F5F3EE] hover:bg-[#181B21] flex items-center gap-2.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#E8D8B8] text-[16px]">content_copy</span>
                <span>Copy text</span>
              </button>
            )}

            {msg.type === 'IMAGE' && (
              <button
                type="button"
                onClick={() => {
                  setShowContextMenu(false);
                  onSelectPhoto(msg);
                }}
                className="w-full px-3.5 py-2 text-xs text-left text-[#F5F3EE] hover:bg-[#181B21] flex items-center gap-2.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#ffb3af] text-[16px]">visibility</span>
                <span>View Photo</span>
              </button>
            )}
          </div>
        )}

        {/* EXPIRED / BURNED CARD */}
        {isExpired ? (
          <div className="flex items-end gap-2">
            {!isMe && (
              <div className="w-7 h-7 rounded-full bg-[#1e2025] border border-white/5 flex-shrink-0 flex items-center justify-center text-[#909095]">
                <span className="material-symbols-outlined text-[14px]">person</span>
              </div>
            )}
            <div className="px-3.5 py-2 rounded-2xl bg-[#1a1b21] border border-white/5 flex items-center gap-2 text-xs text-[#909095] font-mono select-none">
              <span className="material-symbols-outlined text-[15px] text-[#ffb4ab]">lock</span>
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
              <div className="flex items-end gap-2">
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-[#1e2025] border border-white/5 flex-shrink-0 flex items-center justify-center text-[#c7c6cb]">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                  </div>
                )}

                {isBurnOnReadLocked ? (
                  <button
                    type="button"
                    onClick={() => onRevealMessage(msg)}
                    className="p-3.5 rounded-2xl bg-[#1e2025] border border-[#ffb3af]/40 hover:border-[#ffb3af] text-left transition-all cursor-pointer group/btn shadow-sm"
                  >
                    <div className="flex items-center gap-1.5 text-[#ffb3af] font-label-md text-xs font-semibold mb-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      <span>Confidential Note</span>
                    </div>
                    <div className="font-body-sm text-[12px] text-[#c7c6cb] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-[#ffb3af]">visibility</span>
                      <span>Tap to view &amp; start timer</span>
                    </div>
                  </button>
                ) : (
                  <div
                    className={`px-4 py-2.5 shadow-md transition-all ${
                      isMe
                        ? 'msg-bubble-out bg-[#282a2f] border border-white/5 text-[#e2e2e9]'
                        : 'msg-bubble-in bg-[#1e2025] border border-white/5 text-[#e2e2e9]'
                    }`}
                  >
                    {/* QUOTED REPLY PREVIEW BLOCK */}
                    {hasReply && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (msg.replyToMessageId) {
                            onNavigateToMessage(msg.replyToMessageId);
                          }
                        }}
                        className="w-full mb-2 p-2 rounded-xl bg-[#14151a]/90 hover:bg-[#181a21] border-l-2 border-[#ffb3af] flex flex-col text-left transition-colors cursor-pointer group/quote overflow-hidden select-none"
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[11px] font-mono font-bold text-[#ffb3af]">
                            {isReplySenderMe ? 'You' : 'Partner'}
                          </span>
                          <span className="material-symbols-outlined text-[13px] text-[#909095] group-hover/quote:text-[#e2e2e9] transition-colors">
                            reply
                          </span>
                        </div>

                        {replyPreview?.isUnavailable ? (
                          <div className="flex items-center gap-1 text-[11px] text-[#909095] font-mono italic">
                            <span className="material-symbols-outlined text-[13px] text-[#ffb4ab]">lock</span>
                            <span>Original message expired</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-[#c7c6cb] font-sans">
                            {replyPreview?.type === 'VOICE' && (
                              <span className="material-symbols-outlined text-[14px] text-[#ffb3af]">
                                graphic_eq
                              </span>
                            )}
                            {replyPreview?.type === 'IMAGE' && (
                              <span className="material-symbols-outlined text-[14px] text-[#ffb3af]">
                                image
                              </span>
                            )}
                            <span className="truncate break-words font-normal">
                              {replyPreview?.previewText || 'Quoted message'}
                            </span>
                          </div>
                        )}
                      </button>
                    )}

                    <p className="font-body-md text-[15px] leading-relaxed break-words font-normal">
                      {msg.textContent}
                    </p>

                    {/* Metadata Footer */}
                    <div
                      className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] font-mono select-none ${
                        isMe ? 'text-[#c7c6cb]' : 'text-[#909095]'
                      }`}
                    >
                      {countdownStr && (
                        <span className="flex items-center gap-0.5 font-bold text-[#ffb3af]">
                          <span className="material-symbols-outlined text-[11px]">local_fire_department</span>
                          <span>{countdownStr}</span>
                        </span>
                      )}
                      <span>{timeStr}</span>
                      {isMe && (
                        <span className="material-symbols-outlined text-[13px] text-[#ffb3af]">
                          done_all
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVE VOICE MESSAGE */}
            {msg.type === 'VOICE' && (
              <div className="flex items-end gap-2">
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-[#1e2025] border border-white/5 flex-shrink-0 flex items-center justify-center text-[#c7c6cb]">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                  </div>
                )}
                <div className="flex flex-col">
                  {/* Quoted preview above player if voice message is replying to something */}
                  {hasReply && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (msg.replyToMessageId) {
                          onNavigateToMessage(msg.replyToMessageId);
                        }
                      }}
                      className="w-full mb-1.5 p-2 rounded-xl bg-[#14151a]/90 hover:bg-[#181a21] border-l-2 border-[#ffb3af] flex flex-col text-left transition-colors cursor-pointer group/quote overflow-hidden select-none"
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[11px] font-mono font-bold text-[#ffb3af]">
                          {isReplySenderMe ? 'You' : 'Partner'}
                        </span>
                        <span className="material-symbols-outlined text-[13px] text-[#909095] group-hover/quote:text-[#e2e2e9] transition-colors">
                          reply
                        </span>
                      </div>
                      {replyPreview?.isUnavailable ? (
                        <div className="flex items-center gap-1 text-[11px] text-[#909095] font-mono italic">
                          <span className="material-symbols-outlined text-[13px] text-[#ffb4ab]">lock</span>
                          <span>Original message expired</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-[#c7c6cb] font-sans">
                          {replyPreview?.type === 'VOICE' && (
                            <span className="material-symbols-outlined text-[14px] text-[#ffb3af]">
                              graphic_eq
                            </span>
                          )}
                          {replyPreview?.type === 'IMAGE' && (
                            <span className="material-symbols-outlined text-[14px] text-[#ffb3af]">
                              image
                            </span>
                          )}
                          <span className="truncate break-words font-normal">
                            {replyPreview?.previewText || 'Quoted message'}
                          </span>
                        </div>
                      )}
                    </button>
                  )}

                  <VoiceMessagePlayer
                    audioSrc={msg.mediaReference}
                    duration={msg.duration}
                    isMe={isMe}
                    burnOnRead={msg.burnOnRead}
                    deferAutoDownload={
                      networkSettings
                        ? shouldDeferMediaDownload('voice', networkSettings) && !isMe
                        : false
                    }
                    onPlay={() => {
                      if (!isMe && msg.burnOnRead && onViewMessage) {
                        onViewMessage(msg.id);
                      }
                    }}
                  />
                  {countdownStr && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-[#ffb3af] font-bold mt-1 px-1">
                      <span className="material-symbols-outlined text-[11px] animate-pulse">
                        local_fire_department
                      </span>
                      <span>{countdownStr}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTIVE IMAGE MESSAGE */}
            {msg.type === 'IMAGE' && (
              <div className="flex items-end gap-2">
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-[#1e2025] border border-white/5 flex-shrink-0 flex items-center justify-center text-[#c7c6cb]">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                  </div>
                )}
                <div className="flex flex-col">
                  {/* Quoted preview above photo if photo is replying to something */}
                  {hasReply && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (msg.replyToMessageId) {
                          onNavigateToMessage(msg.replyToMessageId);
                        }
                      }}
                      className="w-full mb-1.5 p-2 rounded-xl bg-[#14151a]/90 hover:bg-[#181a21] border-l-2 border-[#ffb3af] flex flex-col text-left transition-colors cursor-pointer group/quote overflow-hidden select-none"
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[11px] font-mono font-bold text-[#ffb3af]">
                          {isReplySenderMe ? 'You' : 'Partner'}
                        </span>
                        <span className="material-symbols-outlined text-[13px] text-[#909095] group-hover/quote:text-[#e2e2e9] transition-colors">
                          reply
                        </span>
                      </div>
                      {replyPreview?.isUnavailable ? (
                        <div className="flex items-center gap-1 text-[11px] text-[#909095] font-mono italic">
                          <span className="material-symbols-outlined text-[13px] text-[#ffb4ab]">lock</span>
                          <span>Original message expired</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-[#c7c6cb] font-sans">
                          {replyPreview?.type === 'VOICE' && (
                            <span className="material-symbols-outlined text-[14px] text-[#ffb3af]">
                              graphic_eq
                            </span>
                          )}
                          {replyPreview?.type === 'IMAGE' && (
                            <span className="material-symbols-outlined text-[14px] text-[#ffb3af]">
                              image
                            </span>
                          )}
                          <span className="truncate break-words font-normal">
                            {replyPreview?.previewText || 'Quoted message'}
                          </span>
                        </div>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectPhoto(msg)}
                    className="p-1.5 rounded-[20px] bg-[#1e2025] border border-white/10 hover:border-[#ffb3af]/60 transition-all cursor-pointer text-left shadow-sm group relative overflow-hidden"
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
                        <div className="w-44 h-28 flex items-center justify-center bg-[#1a1b21]">
                          <span className="font-mono text-xs text-[#909095]">Image burned</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs group-hover:bg-black/20 transition-colors">
                        <span className="px-3 py-1 rounded-full bg-[#111318]/90 border border-white/10 text-xs font-mono text-[#e2e2e9] flex items-center gap-1.5 shadow-sm">
                          <span className="material-symbols-outlined text-[14px] text-[#ffb3af]">visibility</span>
                          <span>View Photo</span>
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Inline Temporary Copied Text Toast */}
      {copiedNotification && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-[#111318] border border-[#ffb3af]/40 text-[#ffb3af] text-[10px] font-mono shadow-lg animate-fade-in z-30 pointer-events-none">
          Copied to clipboard
        </div>
      )}
    </div>
  );
};
