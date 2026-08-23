/**
 * 부모 잠금 번호 정하기
 *
 * 왜 필수로 만드는가: 진짜 위험은 낯선 사람이 아니라 이 기기를 쓰는 아이다.
 * 잠금이 없으면 아이가 난이도를 쉬움으로 바꾸거나, 저금통을 현금으로 처리하거나,
 * 남의 프로필을 지울 수 있다. 번호 하나면 전부 막힌다.
 *
 * 이 번호 뒤에 있는 것: 부모 리포트 · 난이도 설정 · 아이 추가/삭제 · 현금 지급.
 * 아이는 스스로 등록할 수 없고 부모만 추가할 수 있다 — 이 기기에서의 승인제다.
 *
 * 막지 못하는 것도 분명히 해 둔다. 다른 기기에서 주소를 열면 그 기기는 처음부터
 * 새로 시작한다(기록이 서로 안 보이므로 새는 것은 없다). 서버 없이 그것까지
 * 막으려면 흉내만 내게 되는데, 막는 척하는 잠금은 없느니만 못하다.
 */

import { h, toast } from '../dom.js';
import * as store from '../../state.js';
import * as fx from '../../feedback.js';

export function lock(go, { next = 'home' } = {}) {
  let first = '';
  let second = '';
  let stage = 1;

  const title = h('div', { class: 'h1' }, '부모님 잠금 번호');
  const desc = h('div', { class: 'muted' }, '숫자 4개를 정해주세요');
  const disp = h('div', { class: 'pad-display is-empty' }, '····');
  const grid = h('div', { class: 'pad-grid' });

  const paint = () => {
    const cur = stage === 1 ? first : second;
    disp.textContent = '•'.repeat(cur.length) + '·'.repeat(4 - cur.length);
    disp.classList.toggle('is-empty', !cur.length);
    title.textContent = stage === 1 ? '부모님 잠금 번호' : '한 번 더';
    desc.textContent = stage === 1 ? '숫자 4개를 정해주세요' : '확인을 위해 다시 눌러주세요';
  };

  const submit = () => {
    if (stage === 1) {
      if (first.length < 4) return;
      stage = 2; paint(); return;
    }
    if (second.length < 4) return;
    if (first !== second) {
      toast('번호가 서로 달라요');
      first = ''; second = ''; stage = 1; fx.wrong(); paint();
      return;
    }
    store.updateSettings({ parentPin: first });
    fx.correct();
    toast('잠금을 켰어요');
    // 방금 두 번 눌러 정한 사람에게 세 번째로 또 묻지 않는다
    go(next, { unlocked: true });
  };

  for (const k of ['1','2','3','4','5','6','7','8','9','del','0','']) {
    if (k === '') { grid.append(h('div')); continue; }
    grid.append(h('button', {
      class: 'pad-key' + (k === 'del' ? ' pad-del' : ''),
      onclick: () => {
        fx.tap();
        if (stage === 1) {
          first = k === 'del' ? first.slice(0, -1) : (first + k).slice(0, 4);
        } else {
          second = k === 'del' ? second.slice(0, -1) : (second + k).slice(0, 4);
        }
        paint();
        if ((stage === 1 ? first : second).length === 4) setTimeout(submit, 180);
      },
    }, k === 'del' ? '⌫' : k));
  }
  paint();

  return h('div', { class: 'screen' },
    h('div', { style: { textAlign: 'center', padding: '18px 0 4px' } },
      h('div', { style: { fontSize: '44px' } }, '🔒'),
      title,
      desc,
    ),
    h('div', { class: 'lockpad' }, disp, h('div', { style: { height: '10px' } }), grid),
    h('div', { class: 'note' },
      '이 번호 뒤에 부모님 화면이 들어갑니다 — 학습 리포트, 난이도 설정, ',
      '아이 추가와 삭제, 저금통 현금 지급. 아이는 스스로 등록할 수 없고 ',
      '부모님만 추가할 수 있어요.'),
    h('div', { class: 'muted', style: { fontSize: '13px' } },
      '⚠️ 번호를 잊으면 부모님 화면에 들어갈 수 없어요. ',
      '백업 파일 안에 적혀 있으니 가끔 백업을 받아두시거나 따로 적어두세요.'),
    h('div', { style: { height: '8px' } }),
  );
}
