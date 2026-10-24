// 앱 버전이 바뀔 때마다 캐시 이름도 함께 변경합니다.
const APP_VERSION = '3.73';
const CACHE_NAME = `arrow-sim-v${APP_VERSION}`;
const ASSETS_TO_CACHE = [
  `./?v=${APP_VERSION}`,
  `./index.html?v=${APP_VERSION}`,
  `./style.css?v=${APP_VERSION}`,
  './manifest.json',
  `./ui.js?v=3.73`,
  `./physics.js?v=3.73`,
  './icon-192-v316.png',
  './icon-512-v316.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('오프라인 자원 캐싱 중...', APP_VERSION);
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // 대기 상태를 건너뛰어 새 버전을 즉시 활성화합니다.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )),
      self.clients.claim()
    ])
  );
});

// 온라인에서는 최신 파일을 우선 사용하고, 네트워크가 끊기면 캐시로 전환합니다.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok && new URL(event.request.url).origin === self.location.origin) {
          const responseForCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseForCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') return caches.match(`./index.html?v=${APP_VERSION}`);
        return new Response('오프라인 상태입니다. 네트워크 연결을 확인해주세요.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }))
  );
});
