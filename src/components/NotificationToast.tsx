import React, { useState, useEffect } from 'react';
import type { VeloraNotification } from '../types';
import { triggerHaptic } from '../utils/helpers';
import { subscribeToInAppToasts, emitNotificationRoute } from '../utils/notifications';

export const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<VeloraNotification | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToInAppToasts((notification) => {
      setActiveToast(notification);
      setIsVisible(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!activeToast) return;

    // Auto-dismiss after 3.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setActiveToast(null), 300);
    }, 3500);

    return () => clearTimeout(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  const handleClick = () => {
    triggerHaptic('light');
    emitNotificationRoute({
      roomCode: activeToast.roomCode,
      type: activeToast.type,
      messageId: activeToast.messageId,
      callId: activeToast.callId,
    });
    setIsVisible(false);
    setTimeout(() => setActiveToast(null), 200);
  };

  const getIcon = () => {
    switch (activeToast.type) {
      case 'MESSAGE':
        return 'chat_bubble';
      case 'VOICE':
        return 'mic';
      case 'CALL':
        return 'call';
      case 'MISSED_CALL':
        return 'phone_missed';
      case 'ROOM_INVITATION':
        return 'mark_email_unread';
      case 'ROOM_JOINED':
        return 'link';
      case 'PARTICIPANT_LEFT':
        return 'person_remove';
      case 'ROOM_EXPIRING':
        return 'timer';
      case 'ROOM_EXPIRED':
        return 'timer_off';
      default:
        return 'notifications';
    }
  };

  const getAccentColor = () => {
    if (activeToast.type === 'CALL' || activeToast.type === 'MISSED_CALL') {
      return 'text-[#FF5C5C] bg-[#FF5C5C]/10 border-[#FF5C5C]/30';
    }
    if (activeToast.type === 'ROOM_JOINED') {
      return 'text-[#7ED6A5] bg-[#7ED6A5]/10 border-[#7ED6A5]/30';
    }
    return 'text-[#E8D8B8] bg-[#181B21] border-[#272A31]';
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 transition-all duration-300 pointer-events-auto select-none ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div
        onClick={handleClick}
        className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#121419]/95 backdrop-blur-xl border border-[#272A31] shadow-2xl hover:border-[#E8D8B8]/50 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${getAccentColor()}`}
          >
            <span className="material-symbols-outlined text-[18px]">{getIcon()}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-editorial text-xs text-[#F5F3EE] tracking-tight">
                {activeToast.title}
              </span>
              <span className="font-mono text-[9px] text-[#6E7179]">now</span>
            </div>
            <p className="font-body-sm text-[11px] text-[#9B9DA3] truncate group-hover:text-[#F5F3EE] transition-colors mt-0.5">
              {activeToast.body}
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setTimeout(() => setActiveToast(null), 200);
          }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[#6E7179] hover:text-[#F5F3EE] hover:bg-[#181B21] transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>
    </div>
  );
};
