/**
 * 첫 실행 — 아이가 직접 고르게 한다.
 *
 * 캐릭터와 색을 아이가 고르면 "누가 만들어 준 앱"이 아니라 "내 앱"이 된다.
 * 만들고 나서 보여주는 것보다 이 5분이 훨씬 세다.
 */

import { h } from '../dom.js';
import * as store from '../../state.js';
import * as fx from '../../feedback.js';

const FACES = ['🦊', '🐰', '🐱', '🐼', '🦄', '🐧', '🐣', '🐨', '🦖', '🐬', '🌸', '⭐️'];

export function onboard(go) {
  let face = FACES[0];
  let name = '채이';

  const nameInput = h('input', {
    value: name, maxlength: '8', 'aria-label': '이름',
    style: {
      width: '100%', height: '58px', fontSize: '22px', fontWeight: '800',
      textAlign: 'center', border: '2px solid var(--line2)', borderRadius: '18px',
      background: 'var(--card)', color: 'var(--ink)',
    },
  });
  nameInput.addEventListener('input', () => { name = nameInput.value.trim() || '채이'; });

  const grid = h('div', { class: 'map', style: { gridTemplateColumns: 'repeat(4,1fr)' } });
  const paint = () => {
    grid.replaceChildren(...FACES.map((f) => h('button', {
      class: 'tile',
      style: f === face ? { boxShadow: '0 0 0 3px var(--grape)' } : {},
      onclick: () => { face = f; fx.tap(); paint(); },
      'aria-label': f,
    }, h('div', { class: 'tile-inner' }, h('div', { style: { fontSize: '30px' } }, f)))));
  };
  paint();

  return h('div', { class: 'screen' },
    h('div', { style: { textAlign: 'center', padding: '18px 0 4px' } },
      h('div', { style: { fontSize: '46px' } }, '👋'),
      h('div', { class: 'h1', style: { marginTop: '6px' } }, '반가워요!'),
      h('div', { class: 'muted' }, '이름을 쓰고, 좋아하는 친구를 골라요'),
    ),
    nameInput,
    h('div', { class: 'card' }, grid),
    h('div', { class: 'spacer' }),
    h('button', { class: 'btn btn-block', onclick: () => {
      fx.unlock();
      store.createProfile({ name, grade: 2, avatar: face });
      // 곧바로 진단 판으로. 아는 아이에게 2×1부터 가르치지 않기 위해서다.
      go('placement');
    } }, '시작하기'),
    h('div', { style: { height: '8px' } }),
  );
}
