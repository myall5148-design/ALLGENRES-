// Monetag & Push Notification Service Worker for ALLGENRES Soundpulse
self.addEventListener('push', function(e) {
  var data = {};
  if (e.data) {
    try {
      data = e.data.json();
    } catch(err) {
      data = { title: e.data.text() };
    }
  }
  var title = data.title || 'ALLGENRES Soundpulse';
  var message = data.message || 'Latest music updates and artists releases';
  var icon = data.icon || '/favicon.ico';
  var tag = data.tag || 'allgenres-notification';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: icon,
      tag: tag
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
