// VELORA Production Service Worker - Real-Time Background Push Notifications & Privacy-First Ephemeral Routing
const CACHE_NAME = 'velora-v1.2';
const processedEvents = new Set();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean old caches if needed
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      ),
    ])
  );
});

// Helper for event deduplication
function isDuplicateEvent(eventId) {
  if (!eventId) return false;
  if (processedEvents.has(eventId)) return true;
  processedEvents.add(eventId);
  if (processedEvents.size > 100) {
    const it = processedEvents.values();
    for (let i = 0; i < 25; i++) {
      processedEvents.delete(it.next().value);
    }
  }
  return false;
}

// 1. Background Push Event Handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const now = Date.now();

    // Ephemeral Protection: Do not display expired message notifications
    if (data.expiresAt && data.expiresAt <= now) {
      return;
    }

    // Duplicate Prevention
    if (data.eventId && isDuplicateEvent(data.eventId)) {
      return;
    }

    const title = data.title || 'VELORA';
    const notifType = (data.type || 'MESSAGE').toUpperCase();

    // Default privacy-first body if not provided
    let defaultBody = 'New message\nPrivate Space';
    if (notifType === 'VOICE') {
      defaultBody = 'New voice message\nPrivate Space';
    } else if (notifType === 'CALL') {
      defaultBody = 'Incoming private audio call';
    } else if (notifType === 'MISSED_CALL') {
      defaultBody = 'Missed audio call\nPrivate Space';
    } else if (notifType === 'ROOM_JOINED') {
      defaultBody = 'Private Space · Your private room is now connected.';
    } else if (notifType === 'PARTICIPANT_LEFT') {
      defaultBody = 'Private Space · The other participant has left the room.';
    }

    const body = data.body || defaultBody;

    // Actions configuration
    let actions = [];
    if (notifType === 'CALL') {
      actions = [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' },
      ];
    } else if (notifType === 'ROOM_INVITATION') {
      actions = [{ action: 'open', title: 'Open Invitation' }];
    }

    const options = {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || (data.roomCode ? `velora-${data.roomCode}-${notifType.toLowerCase()}` : 'velora-notification'),
      data: {
        roomCode: data.roomCode,
        type: notifType,
        messageId: data.messageId,
        callId: data.callId,
        eventId: data.eventId,
        expiresAt: data.expiresAt,
        timestamp: data.timestamp || now,
        actionUrl: data.actionUrl || (data.roomCode ? `/?room=${encodeURIComponent(data.roomCode)}` : '/'),
      },
      renotify: true,
      vibrate: notifType === 'CALL' ? [300, 150, 300, 150, 600] : [30, 50, 30],
      requireInteraction: notifType === 'CALL',
      actions,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('VELORA ServiceWorker push handling error:', err);
  }
});

// 2. Notification Click Handler & Dynamic Routing
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const action = event.action;

  // If user tapped Decline on an incoming call notification
  if (action === 'decline') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'VELORA_CALL_DECLINE',
            payload: notifData,
          });
        }
      })
    );
    return;
  }

  // Ephemeral protection: if payload has expired, do not open direct message link
  const now = Date.now();
  const isExpired = notifData.expiresAt && notifData.expiresAt <= now;

  let targetUrl = notifData.actionUrl || '/';
  if (notifData.roomCode) {
    const params = new URLSearchParams();
    params.set('room', notifData.roomCode);
    if (notifData.type) params.set('notifType', notifData.type);
    if (notifData.messageId && !isExpired) params.set('msgId', notifData.messageId);
    if (notifData.callId) params.set('callId', notifData.callId);
    if (action === 'answer' || notifData.type === 'CALL') params.set('callAction', action || 'answer');

    targetUrl = `/?${params.toString()}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Check if a VELORA tab is already open
      for (const client of clientList) {
        if ('focus' in client) {
          // Post message to existing client to seamlessly switch view/message
          client.postMessage({
            type: 'VELORA_NOTIFICATION_CLICK',
            payload: notifData,
            action,
            isExpired,
            targetUrl,
          });
          return client.focus();
        }
      }
      // 2. Otherwise open a new window pointing directly to the target room
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Notification Close Handler
self.addEventListener('notificationclose', (event) => {
  const notifData = event.notification.data || {};
  // Track notification dismissal if needed
  if (notifData.type === 'CALL') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({
          type: 'VELORA_NOTIFICATION_DISMISSED',
          payload: notifData,
        });
      }
    });
  }
});
