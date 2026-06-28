const CACHE_NAME = 'bnhabeeb-v17'; // bumped version to clear old 404 cache
const urlsToCache = [
  '/',
  '/dashboard.html',
  '/login.html',
  '/app.js',
  '/manifest.json',
  '/src/images/logo.png',
  '/src/images/logo-sm.png',
  '/src/images/logo-xs.png',
  '/src/images/favicon.ico',
  '/src/images/favicon-16.png',
  '/src/images/favicon-32.png',
  '/src/images/favicon-180.png',
  '/src/images/favicon-192.png',
  '/src/images/favicon-512.png',
  '/src/images/og-image.png',
  '/src/images/og-image-dark.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache files one by one to skip failed ones
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.log('Failed to cache:', url, err);
            });
          })
        );
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchRes => {
        // Only cache successful responses from same origin
        if (fetchRes.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const resClone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return fetchRes;
      });
    }).catch(() => {
      if (event.request.destination === 'document') {
        return caches.match('/dashboard.html');
      }
    })
  );
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'BN HABEEB';
  const options = {
    body: data.body || 'You have a new update',
    icon: '/src/images/favicon-192.png',
    badge: '/src/images/favicon-192.png',
    vibrate: [200, 100, 200],
    data: data.url || '/dashboard.html',
    actions: [
      {action: 'open', title: 'Open'},
      {action: 'close', title: 'Close'}
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data || '/dashboard.html';
  
  if (event.action === 'close') return;
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});