// 서비스 워커 설치 및 활성화 이벤트 (기본 설정)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 🔥 필수: 브라우저가 no-op으로 인식하지 않도록 실제 respondWith를 호출합니다
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // 네트워크가 끊겼을 때(오프라인) 최소한의 기본 응답 처리
        return new Response("오프라인 상태입니다. 네트워크 연결을 확인해주세요.");
      })
  );
});
