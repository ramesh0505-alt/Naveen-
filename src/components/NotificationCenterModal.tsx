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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111318]/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#1e2025] border border-white/5 shadow-2xl p-6 text-[#e2e2e9] rounded-[28px] animate-scale-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#111318] border border-white/5 flex items-center justify-center text-[#ffb3af]">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </div>
            <div>
              <h2 className="font-display-sm text-lg text-[#e2e2e9]">Notifications</h2>
              <p className="font-body-md text-[11px] text-[#c7c6cb]">
                Private room history and call logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 rounded-full text-[11px] font-mono text-[#c7c6cb] hover:text-[#ffb4ab] hover:bg-[#111318] transition-colors cursor-pointer"
                title="Clear all notifications"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#111318] hover:bg-[#282a2f] text-[#c7c6cb] hover:text-[#e2e2e9] flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-[#909095] space-y-2">
              <span className="material-symbols-outlined text-[32px] text-[#33353a]">
                notifications_off
              </span>
              <p className="font-body-md text-xs text-[#c7c6cb]">No notifications yet</p>
              <p className="font-mono text-[10px] text-[#909095] max-w-xs mx-auto">
                Private spaces keep notifications quiet and clean.
              </p>
            </div>
          ) : (
            <>
              {/* Today Section */}
              {todayItems.length > 0 && (
                <div className="space-y-2">
                  <div className="font-mono text-[10px] font-bold text-[#909095] uppercase tracking-wider px-1">
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
                            ? 'bg-[#111318] border-[#ffb3af]/30 shadow-sm'
                            : 'bg-[#1e2025] border-white/5 hover:bg-[#282a2f]'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border flex-shrink-0 mt-0.5 ${
                            item.type === 'CALL' || item.type === 'MISSED_CALL'
                              ? 'bg-[#93000a]/20 text-[#ffb4ab] border-[#ffb4ab]/20'
                              : item.type === 'ROOM_JOINED'
                              ? 'bg-[#ffb3af]/15 text-[#ffb3af] border-[#ffb3af]/20'
                              : 'bg-[#111318] text-[#ffb3af] border-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {getEventIcon(item.type)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-label-md text-xs font-semibold text-[#e2e2e9] truncate flex items-center gap-1.5">
                              {!item.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb3af] inline-block flex-shrink-0" />
                              )}
                              {item.title}
                            </span>
                            <span className="font-mono text-[9px] text-[#909095] flex-shrink-0">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>
                          <p className="font-body-md text-[11px] text-[#c7c6cb] truncate mt-0.5">
                            {item.body}
                          </p>
                          <div className="font-mono text-[9px] text-[#909095] mt-1 flex items-center gap-1">
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
                  <div className="font-mono text-[10px] font-bold text-[#909095] uppercase tracking-wider px-1">
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
                            ? 'bg-[#111318] border-[#ffb3af]/30'
                            : 'bg-[#1e2025] border-white/5 hover:bg-[#282a2f]'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border flex-shrink-0 mt-0.5 ${
                            item.type === 'CALL' || item.type === 'MISSED_CALL'
                              ? 'bg-[#93000a]/20 text-[#ffb4ab] border-[#ffb4ab]/20'
                              : 'bg-[#111318] text-[#c7c6cb] border-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {getEventIcon(item.type)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-label-md text-xs font-semibold text-[#e2e2e9] truncate flex items-center gap-1.5">
                              {!item.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb3af] inline-block flex-shrink-0" />
                              )}
                              {item.title}
                            </span>
                            <span className="font-mono text-[9px] text-[#909095] flex-shrink-0">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>
                          <p className="font-body-md text-[11px] text-[#c7c6cb] truncate mt-0.5">
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
        <div className="pt-3 border-t border-white/5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#c7c6ca] text-[#303034] font-label-md text-xs font-bold hover:bg-[#e3e2e6] transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
