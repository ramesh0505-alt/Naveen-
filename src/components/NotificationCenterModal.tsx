import React, { useState, useEffect } from 'react';
import type { VeloraNotification } from '../types';
import { triggerHaptic } from '../utils/helpers';
import {
  loadNotificationHistory,
  clearNotificationHistory,
  markNotificationAsRead,
  emitNotificationRoute,
} from '../utils/notifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification?: (notif: VeloraNotification) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onSelectNotification,
}) => {
  const [notifications, setNotifications] = useState<VeloraNotification[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNotifications(loadNotificationHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    triggerHaptic('medium');
    clearNotificationHistory();
    setNotifications([]);
  };

  const handleItemClick = (notif: VeloraNotification) => {
    triggerHaptic('light');
    markNotificationAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );

    if (onSelectNotification) {
      onSelectNotification(notif);
    } else {
      emitNotificationRoute({
        roomCode: notif.roomCode,
        type: notif.type,
        messageId: notif.messageId,
        callId: notif.callId,
      });
    }
    onClose();
  };

  // Group notifications into Today vs Earlier
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);

  const todayItems = notifications.filter((n) => n.timestamp >= startOfToday);
  const earlierItems = notifications.filter((n) => n.timestamp < startOfToday);

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.max(0, now - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#121419] border border-[#272A31] shadow-2xl p-6 text-[#F5F3EE] rounded-[28px] animate-scale-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#272A31]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#181B21] border border-[#272A31] flex items-center justify-center text-[#E8D8B8]">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </div>
            <div>
              <h2 className="font-editorial text-lg text-[#F5F3EE]">Notifications</h2>
              <p className="font-body-sm text-[11px] text-[#9B9DA3]">
                Private room history and call logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 rounded-full text-[11px] font-mono text-[#9B9DA3] hover:text-[#FF5C5C] hover:bg-[#181B21] transition-colors cursor-pointer"
                title="Clear all notifications"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#181B21] hover:bg-[#272A31] text-[#9B9DA3] hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-[#6E7179] space-y-2">
              <span className="material-symbols-outlined text-[32px] text-[#3C4049]">
                notifications_off
              </span>
              <p className="font-body-sm text-xs text-[#9B9DA3]">No notifications yet</p>
              <p className="font-mono text-[10px] text-[#6E7179] max-w-xs mx-auto">
                Private spaces keep notifications quiet and clean.
              </p>
            </div>
          ) : (
            <>
              {/* Today Section */}
              {todayItems.length > 0 && (
                <div className="space-y-2">
                  <div className="font-mono text-[10px] font-bold text-[#6E7179] uppercase tracking-wider px-1">
                    Today
                  </div>
                  <div className="space-y-1.5">
                    {todayItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className={`w-full flex items-start gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          !item.read
                            ? 'bg-[#181B21] border-[#E8D8B8]/30 shadow-sm'
                            : 'bg-[#121419] border-[#272A31] hover:bg-[#181B21]/70'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border flex-shrink-0 mt-0.5 ${
                            item.type === 'CALL' || item.type === 'MISSED_CALL'
                              ? 'bg-[#FF5C5C]/10 text-[#FF5C5C] border-[#FF5C5C]/20'
                              : item.type === 'ROOM_JOINED'
                              ? 'bg-[#7ED6A5]/10 text-[#7ED6A5] border-[#7ED6A5]/20'
                              : 'bg-[#181B21] text-[#E8D8B8] border-[#272A31]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {getEventIcon(item.type)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-label-md text-xs font-semibold text-[#F5F3EE] truncate flex items-center gap-1.5">
                              {!item.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E8D8B8] inline-block flex-shrink-0" />
                              )}
                              {item.title}
                            </span>
                            <span className="font-mono text-[9px] text-[#6E7179] flex-shrink-0">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>
                          <p className="font-body-sm text-[11px] text-[#9B9DA3] truncate mt-0.5">
                            {item.body}
                          </p>
                          <div className="font-mono text-[9px] text-[#6E7179] mt-1 flex items-center gap-1">
                            <span>Room: {item.roomCode}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Earlier Section */}
              {earlierItems.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="font-mono text-[10px] font-bold text-[#6E7179] uppercase tracking-wider px-1">
                    Earlier
                  </div>
                  <div className="space-y-1.5">
                    {earlierItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className={`w-full flex items-start gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          !item.read
                            ? 'bg-[#181B21] border-[#E8D8B8]/30'
                            : 'bg-[#121419] border-[#272A31] hover:bg-[#181B21]/70'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border flex-shrink-0 mt-0.5 ${
                            item.type === 'CALL' || item.type === 'MISSED_CALL'
                              ? 'bg-[#FF5C5C]/10 text-[#FF5C5C] border-[#FF5C5C]/20'
                              : 'bg-[#181B21] text-[#9B9DA3] border-[#272A31]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {getEventIcon(item.type)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-label-md text-xs font-semibold text-[#F5F3EE] truncate flex items-center gap-1.5">
                              {!item.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E8D8B8] inline-block flex-shrink-0" />
                              )}
                              {item.title}
                            </span>
                            <span className="font-mono text-[9px] text-[#6E7179] flex-shrink-0">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>
                          <p className="font-body-sm text-[11px] text-[#9B9DA3] truncate mt-0.5">
                            {item.body}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#272A31] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md text-xs font-bold hover:bg-[#F0E3C8] transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
