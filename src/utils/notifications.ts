import type {
  VeloraNotification,
  VeloraNotificationType,
  NotificationPreferences,
  MemberRole,
  PushSubscriptionData,
} from '../types';
import { triggerHaptic } from './helpers';
import { SoundEffects } from './audio';

const PREFS_STORAGE_KEY = 'velora_notification_prefs';
const HISTORY_STORAGE_KEY = 'velora_notification_history';
const PROCESSED_IDS_KEY = 'velora_processed_notifs';

// Default Privacy-First Preferences
export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  messagePreviews: false, // Privacy-first default (Do not expose message content)
  voiceMessages: true,
  audioCalls: true,
  roomActivity: true,
  sound: true,
  vibration: true,
  permissionPromptDismissed: false,
};

// In-memory deduplication set (auto-clears older items)
const seenNotificationIds = new Set<string>();

// Multi-Tab Coordination via BroadcastChannel
let notificationChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    notificationChannel = new BroadcastChannel('velora_notifications_bus');
  }
} catch {
  // BroadcastChannel unavailable
}

// 1. Preferences Management
export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

// 2. Notification Permission Status
export function getNotificationPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission || 'denied';
  }
}

// 3. Notification History & Persistence (Ephemeral-Safe)
export function loadNotificationHistory(): VeloraNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const items: VeloraNotification[] = JSON.parse(raw);
    const now = Date.now();
    // Ephemeral filtering: Drop notifications whose expiration has passed
    const valid = items.filter((n) => !n.expiresAt || n.expiresAt > now);
    if (valid.length !== items.length) {
      saveNotificationHistory(valid);
    }
    return valid.slice(0, 40); // Keep compact list
  } catch {
    return [];
  }
}

export function saveNotificationHistory(items: VeloraNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const valid = items.filter((n) => !n.expiresAt || n.expiresAt > now).slice(0, 40);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(valid));
  } catch {}
}

export function addNotificationToHistory(notification: VeloraNotification): void {
  const current = loadNotificationHistory();
  // Deduplicate in history
  if (current.some((n) => n.id === notification.id)) return;
  const updated = [notification, ...current];
  saveNotificationHistory(updated);

  // Sync across tabs
  if (notificationChannel) {
    try {
      notificationChannel.postMessage({
        type: 'HISTORY_UPDATED',
        notification,
      });
    } catch {}
  }
}

export function markNotificationAsRead(id: string): void {
  const current = loadNotificationHistory();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotificationHistory(updated);
  if (notificationChannel) {
    try {
      notificationChannel.postMessage({ type: 'MARK_READ', id });
    } catch {}
  }
}

export function clearNotificationHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    if (notificationChannel) {
      notificationChannel.postMessage({ type: 'HISTORY_CLEARED' });
    }
  } catch {}
}

export function cleanRoomNotifications(roomCode: string): void {
  const current = loadNotificationHistory();
  const normalized = roomCode.trim().toUpperCase();
  const updated = current.filter((n) => n.roomCode.trim().toUpperCase() !== normalized);
  saveNotificationHistory(updated);
}

// 4. Deduplication Helper
export function isDuplicateNotification(id: string): boolean {
  if (!id) return false;
  if (seenNotificationIds.has(id)) return true;
  seenNotificationIds.add(id);

  // Limit memory growth
  if (seenNotificationIds.size > 200) {
    const arr = Array.from(seenNotificationIds);
    arr.slice(0, 50).forEach((key) => seenNotificationIds.delete(key));
  }
  return false;
}

// 5. Content Formatter based on Privacy Settings
export function formatNotificationText(
  type: VeloraNotificationType,
  prefs: NotificationPreferences,
  params: {
    senderRole?: MemberRole;
    senderName?: string;
    textContent?: string;
    duration?: number;
    roomCode?: string;
    timeRemainingText?: string;
  }
): { title: string; body: string } {
  const isPreview = prefs.messagePreviews;
  const senderDisplayName = params.senderName || (params.senderRole === 'owner' ? 'Owner' : 'Guest');

  switch (type) {
    case 'MESSAGE': {
      if (isPreview && params.textContent) {
        return {
          title: 'VELORA',
          body: `${senderDisplayName}: "${params.textContent.length > 50 ? params.textContent.slice(0, 50) + '...' : params.textContent}"`,
        };
      }
      return {
        title: 'VELORA',
        body: 'New message from your private space',
      };
    }

    case 'VOICE': {
      if (isPreview && params.duration) {
        const mins = Math.floor(params.duration / 60);
        const secs = params.duration % 60;
        const durStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        return {
          title: 'VELORA',
          body: `${senderDisplayName}: Voice message · ${durStr}`,
        };
      }
      return {
        title: 'VELORA',
        body: 'New voice message',
      };
    }

    case 'CALL':
      return {
        title: 'VELORA',
        body: 'Private Audio Call · Incoming call',
      };

    case 'MISSED_CALL':
      return {
        title: 'VELORA',
        body: 'Missed audio call · Private Space',
      };

    case 'ROOM_INVITATION':
      return {
        title: 'VELORA',
        body: 'Private Space invitation · Someone invited you to a private room.',
      };

    case 'ROOM_JOINED':
      return {
        title: 'VELORA',
        body: 'Private Space · Your private room is now connected.',
      };

    case 'PARTICIPANT_LEFT':
      return {
        title: 'VELORA',
        body: 'Private Space · The other participant has left the room.',
      };

    case 'ROOM_EXPIRING':
      return {
        title: 'VELORA',
        body: `Private Space expires in ${params.timeRemainingText || 'a few moments'}.`,
      };

    case 'ROOM_EXPIRED':
      return {
        title: 'VELORA',
        body: 'Private Space expired · This room is no longer available.',
      };

    case 'CONNECTION':
      return {
        title: 'VELORA',
        body: 'Private Space reconnected.',
      };

    default:
      return {
        title: 'VELORA',
        body: 'New private notification',
      };
  }
}

// 6. In-App Toast Event Dispatcher & Listener
type InAppToastListener = (notification: VeloraNotification) => void;
const toastListeners = new Set<InAppToastListener>();

export function subscribeToInAppToasts(listener: InAppToastListener): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function emitInAppToast(notification: VeloraNotification): void {
  toastListeners.forEach((fn) => {
    try {
      fn(notification);
    } catch (err) {
      console.error('Toast listener error:', err);
    }
  });
}

// 7. Route Click Listener
type NotificationRouteListener = (data: {
  roomCode: string;
  type: VeloraNotificationType;
  messageId?: string;
  callId?: string;
  action?: string;
  isExpired?: boolean;
}) => void;

const routeListeners = new Set<NotificationRouteListener>();

export function subscribeToNotificationRouting(listener: NotificationRouteListener): () => void {
  routeListeners.add(listener);
  return () => {
    routeListeners.delete(listener);
  };
}

export function emitNotificationRoute(data: {
  roomCode: string;
  type: VeloraNotificationType;
  messageId?: string;
  callId?: string;
  action?: string;
  isExpired?: boolean;
}): void {
  routeListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (err) {
      console.error('Route listener error:', err);
    }
  });
}

export function onNotificationRoute(listener: NotificationRouteListener): () => void {
  return subscribeToNotificationRouting(listener);
}

// 8. Unread Badge Counter Logic (Ephemeral-Aware: Excludes expired messages)
export function getUnreadNotificationCount(): number {
  const history = loadNotificationHistory();
  const now = Date.now();
  return history.filter((n) => !n.read && (!n.expiresAt || n.expiresAt > now)).length;
}

export function updateAppBadge(count: number): void {
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  }
}

// 9. Service Worker & Push Notification Helper
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

// VAPID helper conversion
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush(
  sessionToken: string,
  roomCode: string
): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return false;

    // 1. Fetch public VAPID key
    const res = await fetch('/api/notifications/vapid-public-key');
    if (!res.ok) return false;
    const { publicKey } = await res.json();
    if (!publicKey) return false;

    // 2. Subscribe with pushManager
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // 3. Post subscription to backend
    const subJson = subscription.toJSON();
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        roomCode,
        subscription: subJson,
      }),
    });

    return true;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    return false;
  }
}

export async function unsubscribeUserFromPush(sessionToken: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager?.getSubscription();
      if (sub) {
        await sub.unsubscribe().catch(() => {});
      }
    }

    if (sessionToken) {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      }).catch(() => {});
    }
  } catch {}
}

// 9. Master Notification Dispatcher
// Intelligently decides between Foreground Toast vs System/Browser Push
export function dispatchNotification(
  notification: VeloraNotification,
  context?: {
    isCurrentRoom?: boolean;
    isAppForeground?: boolean;
    activeScreen?: string;
  }
): void {
  const isForeground = context?.isAppForeground ?? (typeof document !== 'undefined' ? document.visibilityState === 'visible' : true);
  const isCurrentRoom = context?.isCurrentRoom ?? true;
  const activeScreen = context?.activeScreen ?? 'CHAT';

  const prefs = loadNotificationPreferences();
  if (!prefs.enabled) return;

  // Filter based on event specific preference switches
  if (notification.type === 'MESSAGE' && !prefs.enabled) return;
  if (notification.type === 'VOICE' && !prefs.voiceMessages) return;
  if ((notification.type === 'CALL' || notification.type === 'MISSED_CALL') && !prefs.audioCalls) return;
  if (
    (notification.type === 'ROOM_JOINED' ||
      notification.type === 'PARTICIPANT_LEFT' ||
      notification.type === 'ROOM_EXPIRING' ||
      notification.type === 'ROOM_EXPIRED') &&
    !prefs.roomActivity
  ) {
    return;
  }

  // Deduplicate
  if (isDuplicateNotification(notification.id)) {
    return;
  }

  // Record into history
  addNotificationToHistory(notification);

  // Play sound & vibration if enabled
  if (prefs.sound) {
    if (notification.type === 'MESSAGE') {
      SoundEffects.playMessageReceived();
    } else if (notification.type === 'CALL') {
      // Ringtone handled by call system
    } else if (notification.type === 'MISSED_CALL') {
      SoundEffects.playCallEnded();
    }
  }

  if (prefs.vibration) {
    if (notification.type === 'MESSAGE' || notification.type === 'VOICE') {
      triggerHaptic('incoming-message');
    } else if (notification.type === 'MISSED_CALL') {
      triggerHaptic('warning');
    }
  }

  const isInsideSameActiveChat = isCurrentRoom && activeScreen === 'CHAT' && isForeground;

  // RULE: If user is inside the active chat, do NOT trigger system notification;
  // For incoming calls, always show call UI.
  if (isInsideSameActiveChat) {
    if (notification.type !== 'MESSAGE') {
      // Show subtle in-app toast for voice, participant left, or room updates
      emitInAppToast(notification);
    }
    return;
  }

  // If outside chat or in other screen:
  if (isForeground) {
    // Show in-app floating toast
    emitInAppToast(notification);
  }

  // If app is backgrounded or in another tab or system supports notifications:
  if (!isForeground && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const formatted = formatNotificationText(notification.type, prefs, {
        senderRole: notification.senderRole,
        senderName: notification.senderName,
        duration: notification.duration,
        roomCode: notification.roomCode,
      });

      const browserNotif = new Notification(formatted.title, {
        body: formatted.body,
        icon: '/icon.svg',
        tag: `velora-${notification.roomCode}-${notification.type}`,
        data: {
          roomCode: notification.roomCode,
          type: notification.type,
          messageId: notification.messageId,
          callId: notification.callId,
          expiresAt: notification.expiresAt,
        },
      });

      browserNotif.onclick = () => {
        window.focus();
        browserNotif.close();
        emitNotificationRoute({
          roomCode: notification.roomCode,
          type: notification.type,
          messageId: notification.messageId,
          callId: notification.callId,
        });
      };
    } catch {
      // Fallback
    }
  }
}
