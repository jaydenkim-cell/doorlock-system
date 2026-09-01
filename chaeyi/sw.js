/**
 * 오프라인 캐시
 * 태블릿 와이파이는 자주 끊긴다. 앱이 안 열리는 경험이 한 번 있으면
 * 아이는 다시 누르지 않는다.
 */
const CACHE = 'chaeyi-v5';   // 8차: 부위 그림으로 그리는 아바타
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  './css/app.css',
  './js/app.js', './js/state.js', './js/srs.js', './js/session.js', './js/feedback.js', './js/ko.js',
  './js/difficulty.js', './js/allowance.js', './js/grades.js',
  './js/answer.js', './js/theme.js',
  './js/ops.js', './js/points.js', './js/cosmetics.js', './js/quests.js',
  './js/generators/_util.js',
  './js/generators/multiply.js', './js/generators/addsub.js',
  './js/generators/divide.js', './js/generators/fraction.js',
  './js/generators/decimal.js', './js/generators/factors.js',
  './js/generators/integers.js', './js/generators/linear.js',
  './js/generators/simul.js', './js/generators/quadratic.js',
  './js/ui/dom.js', './js/ui/numpad.js', './js/ui/avatar.js',
  './js/avatar-art.js', './js/avatar-render.js', './js/recolor.js',
  './js/ui/screens/onboard.js', './js/ui/screens/home.js',
  './js/ui/screens/play.js', './js/ui/screens/result.js', './js/ui/screens/parent.js',
  './js/ui/screens/rally.js', './js/ui/screens/placement.js', './js/ui/screens/who.js', './js/ui/screens/shop.js', './js/ui/screens/lock.js',
  './data/curriculum.json',
  // 부위 그림 — 이게 없으면 오프라인에서 아바타가 빈 칸이 된다
  './assets/parts/body/base.png',
  './assets/parts/hair/bob.png', './assets/parts/hair/curl.png', './assets/parts/hair/long.png', './assets/parts/hair/shag.png',
  './assets/parts/hair/short.png', './assets/parts/hair/twin.png', './assets/parts/hair/wave.png',
  './assets/parts/top/dress.png', './assets/parts/top/hero.png', './assets/parts/top/hoodie.png', './assets/parts/top/overall.png',
  './assets/parts/top/stripe.png', './assets/parts/top/tee.png', './assets/parts/top/turtle.png', './assets/parts/top/uniform.png',
  './assets/parts/shoe/boot.png', './assets/parts/shoe/mary.png', './assets/parts/shoe/sneak.png',
  './assets/parts/acc/bag.png', './assets/parts/acc/freckle.png', './assets/parts/acc/glasses.png', './assets/parts/acc/pin.png',
  './assets/parts/acc/ribbon.png', './assets/parts/acc/sun.png',
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
