/* Timesheet service worker: lets the installed app open without a connection.
   The page itself always works without this file; it only adds offline support when hosted. */
'use strict';

const VERSION = '2.0.0';
const CACHE = `timesheet-${VERSION}`;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];
const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('timesheet-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app page: network first so updates arrive as soon as you're online, cached copy when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Icons, manifest and Google Fonts: serve from cache, refresh in the background.
  if (url.origin === self.location.origin || FONT_HOSTS.includes(url.origin)) {
    event.respondWith(
      caches.match(req).then(hit => {
        const network = fetch(req)
          .then(res => {
            if (res && (res.ok || res.type === 'opaque')) {
              const copy = res.clone();
              caches.open(CACHE).then(cache => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
});
