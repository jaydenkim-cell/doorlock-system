/**
 * 오프라인 캐시
 * 태블릿 와이파이는 자주 끊긴다. 앱이 안 열리는 경험이 한 번 있으면
 * 아이는 다시 누르지 않는다.
 */
const CACHE = 'chaei-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  './css/app.css',
  './js/app.js', './js/state.js', './js/srs.js', './js/session.js', './js/feedback.js', './js/ko.js',
  './js/generators/multiply.js', './js/generators/addsub.js',
  './js/ui/dom.js', './js/ui/numpad.js',
  './js/ui/screens/onboard.js', './js/ui/screens/home.js',
  './js/ui/screens/play.js', './js/ui/screens/result.js', './js/ui/screens/parent.js',
  './data/curriculum.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 네트워크 우선, 실패하면 캐시. (개발 중 수정이 바로 반영되게)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
