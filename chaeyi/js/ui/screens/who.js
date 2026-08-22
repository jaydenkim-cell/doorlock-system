/**
 * "누구야?" — 프로필 선택
 *
 * 아이가 직접 누르는 화면이라 잠금을 걸지 않는다. 형제자매나 놀러 온 조카가
 * 자기 얼굴을 찾아 누르면 그 아이의 진도·저금통으로 들어간다.
 *
 * 진도와 저금통이 프로필 안에 들어 있어서(state.js 의 data[profileId]) 서로 섞이지
 * 않는다. 눌러야 할 것을 잘못 누르는 것만 막으면 되므로 이름과 얼굴을 크게 보여준다.
 */

import { h } from '../dom.js';
import * as store from '../../state.js';
import * as grades from '../../grades.js';
import * as fx from '../../feedback.js';

export function who(go) {
  const list = store.profiles();

  return h('div', { class: 'screen' },
    h('div', { style: { textAlign: 'center', padding: '24px 0 10px' } },
      h('div', { style: { fontSize: '42px' } }, '👋'),
      h('div', { class: 'h1', style: { marginTop: '6px' } }, '누구야?'),
      h('div', { class: 'muted' }, '자기 얼굴을 눌러요'),
    ),

    h('div', { class: 'who-list' },
      list.map((p) => h('button', {
        class: 'who-card',
        onclick: () => { fx.tap(); store.setActiveProfile(p.id); go('home'); },
      },
        h('div', { class: 'who-face' }, p.avatar),
        h('div', { style: { flex: '1', textAlign: 'left' } },
          h('div', { class: 'who-name' }, p.name),
          h('div', { class: 'muted' }, grades.of(p.grade).label),
        ),
        h('div', { class: 'go' }, '›'),
      )),
    ),

    h('div', { class: 'spacer' }),
    h('button', { class: 'btn btn-block btn-ghost', onclick: () => go('parent') },
      '👨‍👩‍👧 부모님 화면'),
    h('div', { style: { height: '8px' } }),
  );
}
