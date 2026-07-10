// 캐시 저장소 이름 및 관리할 자원 목록 정의
const CACHE_NAME = 'arrow-sim-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './ui.js',
  './physics.js',
  './icon-192.png',
  './icon-512.png'
];

// 1. 서비스 워커 설치 시 필수 파일들을 로컬에 저장 (캐싱)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('오프라인 자원 캐싱 중...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 활성화 시 오래된 캐시가 있다면 자동으로 삭제 완료
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('오래된 캐시 삭제:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// 3. 네트워크 요청 가로채기: 로컬 캐시 우선 제공 (오프라인 완벽 지원)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 캐시된 파일이 있다면 즉시 반환 (오프라인 상태 및 로딩 속도 향상)
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 캐시에 없는 파일은 네트워크에서 가져오기
      return fetch(event.request).catch(() => {
        // 네트워크도 실패하고 캐시도 없는 특수 상황 예외 처리
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response("오프라인 상태입니다. 네트워크 연결을 확인해주세요.");
      });
    })
  );
});
