// ============================================================================
// [PWA Service Worker] 국궁 탄도학 시뮬레이터 오프라인 캐싱 및 독립 실행 엔진
// ============================================================================

// 캐시 저장소 식별 이름 및 버전 관리
const CACHE_NAME = 'arrow-trajectory-v1';

// 오프라인 환경에서 상시 구동할 필수 리소스 전수 리스트
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './ui.js',
  './physics.js',
  './manifest.json',
  './icon.png' // 앱 아이콘 파일이 폴더에 없다면 생략 가능합니다.
];

// 1. 서비스 워커 설치 이벤트 (최초 앱 등록 및 파일 로컬 백업)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] 필수 자산 로컬 캐시 저장 중...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // 기다리지 않고 즉시 활성화하여 PWA 자격 획득
  self.skipWaiting();
});

// 2. 서비스 워커 활성화 이벤트 (구버전 캐시 정리 및 제어권 획득)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] 이전 세션 구버전 캐시 삭제 중:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 실시간 네트워크 요청 가로채기 (네트워크 차단 시 캐시에서 파일 즉시 즉각 공급)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1순위: 로컬 저장소(캐시)에 이미 저장된 파일이 있다면 인터넷 연결 없이 즉시 반환
      if (cachedResponse) {
        return cachedResponse;
      }
      // 2순위: 캐시에 없는 새로운 요청이라면 실시간 네트워크 통신 수행
      return fetch(event.request);
    })
  );
});
