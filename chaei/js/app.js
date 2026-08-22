/** 부트 + 화면 전환 */

import { h } from './ui/dom.js';
import * as store from './state.js';
import * as fx from './feedback.js';
import { onboard } from './ui/screens/onboard.js';
import { home } from './ui/screens/home.js';
import { play } from './ui/screens/play.js';
import { result } from './ui/screens/result.js';
import { parent } from './ui/screens/parent.js';

const root = document.getElementById('app');

const SCREENS = {
  onboard: (go) => onboard(go),
  home:    (go) => home(go),
  session: (go, p) => play(go, p),
  result:  (go, p) => result(go, p),
  parent:  (go) => parent(go),
};

function go(name, params) {
  // 화면 전환 중에 열려 있던 정답/오답 알림은 정리한다
  document.querySelectorAll('.flash').forEach((e) => e.remove());
  const view = SCREENS[name](go, params);
  root.replaceChildren(view);
  window.scrollTo(0, 0);
  history.replaceState({ name }, '', '#' + name);
}

function boot() {
  store.load();
  // 첫 터치에서 오디오 잠금 해제 (모바일 브라우저 정책)
  window.addEventListener('pointerdown', () => fx.unlock(), { once: true });

  if (!store.activeProfile()) { go('onboard'); return; }
  go('home');
}

// 서비스워커: 오프라인에서도 열리도록. 태블릿은 와이파이가 자주 끊긴다.
// 단일 파일 빌드에는 sw.js 가 없으므로 건너뛴다 (build-standalone.mjs 가 켜는 플래그).
if (!window.__CHAEI_SINGLE_FILE__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.addEventListener('error', (e) => console.error('[채이앱]', e.message));
boot();

// 개발/검증용 훅 (Playwright 등에서 상태를 확인하기 위해)
window.__chaei = { store, go };
