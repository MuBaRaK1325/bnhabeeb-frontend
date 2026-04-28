const CACHE_NAME = 'bnhabeeb-v1'; // bump when you update
const urlsToCache = [
  '/',
  '/dashboard.html',
  '/login.html',
  '/app.js',
  '/images/bnhabeeb-192.png',
  '/images/bnhabeeb-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
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
  // Don't cache API calls
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'BNHABEEB';
  const options = {
    body: data.body || 'You have a new update',
    icon: '/images/bnhabeeb-192.png',
    badge: '/images/bnhabeeb-192.png',
    vibrate: [200, 100, 200],
    data: data.url || '/dashboard.html'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.data || '/dashboard.html'));
});