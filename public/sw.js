// VELORA Service Worker - Privacy-first Ephemeral Push Notifications
const CACHE_NAME = 'velora-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    // Check ephemeral expiry
    if (data.expiresAt && Date.now() > data.expiresAt) {
      return; // Do not display stale/expired message notifications
    }

    const title = data.title || 'VELORA';
    const options = {
      body: data.body || 'New private notification',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || (data.roomCode ? `velora-${data.roomCode}-${data.type || 'gen'}` : 'velora-notification'),
      data: {
        roomCode: data.roomCode,
        type: data.type,
        messageId: data.messageId,
        callId: data.callId,
        expiresAt: data.expiresAt,
        timestamp: data.timestamp || Date.now(),
        url: data.actionUrl || (data.roomCode ? `/?room=${data.roomCode}` : '/'),
      },
      renotify: true,
      vibrate: data.type === 'CALL' ? [200, 100, 200, 100, 400] : [25, 45, 35],
      requireInteraction: data.type === 'CALL',
      actions: data.type === 'CALL' ? [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' }
      ] : (data.type === 'ROOM_INVITATION' ? [
        { action: 'open', title: 'Open Invitation' }
      ] : [])
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Service Worker push error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const action = event.action;

  // Ephemeral protection: if payload expired, still route to app but without expired message
  const now = Date.now();
  const isExpired = notifData.expiresAt && notifData.expiresAt <= now;

  let targetUrl = notifData.url || '/';
  if (notifData.roomCode) {
    targetUrl = `/?room=${encodeURIComponent(notifData.roomCode)}&notifType=${encodeURIComponent(notifData.type || '')}`;
    if (notifData.messageId && !isExpired) {
      targetUrl += `&msgId=${encodeURIComponent(notifData.messageId)}`;
    }
    if (action) {
      targetUrl += `&callAction=${encodeURIComponent(action)}`;
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a VELORA tab is already open, focus it and post routing event
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'VELORA_NOTIFICATION_CLICK',
            data: notifData,
            action,
            isExpired,
          });
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Notification dismissed by user
});
