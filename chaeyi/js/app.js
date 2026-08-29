/** 부트 + 화면 전환 */

import { h } from './ui/dom.js';
import * as store from './state.js';
import * as fx from './feedback.js';
import * as allowance from './allowance.js';
import * as difficulty from './difficulty.js';
import * as points from './points.js';
import * as cosmetics from './cosmetics.js';
import * as quests from './quests.js';
import * as theme from './theme.js';
import * as sess from './session.js';
import { onboard } from './ui/screens/onboard.js';
import { home } from './ui/screens/home.js';
import { play } from './ui/screens/play.js';
import { result } from './ui/screens/result.js';
import { parent } from './ui/screens/parent.js';
import { rally } from './ui/screens/rally.js';
import { placement } from './ui/screens/placement.js';
import { who } from './ui/screens/who.js';
import { lock } from './ui/screens/lock.js';
import { shop } from './ui/screens/shop.js';

const root = document.getElementById('app');

const SCREENS = {
  onboard: (go) => onboard(go),
  home:    (go) => home(go),
  session: (go, p) => play(go, p),
  result:  (go, p) => result(go, p),
  parent:    (go, p) => parent(go, p || {}),
  rally:     (go, p) => rally(go, p || {}),
  placement: (go, p) => placement(go, p || {}),
  who:       (go) => who(go),
  onboard2:  (go) => onboard(go, { first: false }),   // 둘째 아이 추가
  lock:      (go, p) => lock(go, p || {}),
  shop:      (go) => shop(go),
};

let current = null;

function go(name, params) {
  // 화면 전환 중에 열려 있던 정답/오답 알림은 정리한다
  document.querySelectorAll('.flash').forEach((e) => e.remove());
  // 랠리처럼 타이머를 도는 화면은 떠날 때 정리해야 한다
  if (current?.destroy) current.destroy();
  // 학년에 따라 색·문구 톤이 바뀐다 (초1~3 kid / 초4~6 tween / 중1~3 teen)
  theme.apply(root, store.activeProfile()?.grade);
  const view = SCREENS[name](go, params);
  current = view;
  root.replaceChildren(view);
  window.scrollTo(0, 0);
  history.replaceState({ name }, '', '#' + name);
}

function boot() {
  store.load();
  // 첫 터치에서 오디오 잠금 해제 (모바일 브라우저 정책)
  window.addEventListener('pointerdown', () => fx.unlock(), { once: true });

  if (!store.activeProfile()) { go('onboard'); return; }
  // 아이가 여럿이면 누가 쓸 건지 먼저 고른다
  if (store.profiles().length > 1) { go('who'); return; }
  go('home');
}

// 서비스워커: 오프라인에서도 열리도록. 태블릿은 와이파이가 자주 끊긴다.
// 단일 파일 빌드에는 sw.js 가 없으므로 건너뛴다 (build-standalone.mjs 가 켜는 플래그).
if (!window.__CHAEYI_SINGLE_FILE__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.addEventListener('error', (e) => console.error('[채이앱]', e.message));
boot();

/**
 * 개발·검증용 훅.
 *
 * 배포된 주소에서는 열지 않는다. 저금통은 실제 돈 약속이라
 * 개발자도구에서 window.__chaeyi.allowance.adjust(999999) 한 줄이면
 * 잔액을 마음대로 만들 수 있게 된다. 초2가 그럴 일은 없겠지만
 * 형이나 친구가 옆에 있을 수도 있고, 무엇보다 열어둘 이유가 없다.
 *
 * 로컬(테스트)과 ?debug=1 을 붙였을 때만 켠다.
 */
const isLocal = ['localhost', '127.0.0.1', '0.0.0.0', ''].includes(location.hostname);
if (isLocal || new URLSearchParams(location.search).has('debug')) {
  window.__chaeyi = { store, go, sess, allowance, difficulty, points, cosmetics, quests };
}
