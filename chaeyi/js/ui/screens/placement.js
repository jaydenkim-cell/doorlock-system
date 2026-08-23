/**
 * 첫 판 진단
 *
 * 1차에서는 누구나 2×1부터 시작했다. 이미 2단을 아는 아이에게 2×1을 가르치면
 * 그 앱은 지겨운 앱이 된다. 12문항으로 대충 어디까지 아는지 보고 시작점을 옮긴다.
 *
 * 한 문항으로 그 단 전체를 추론하므로 정확하진 않다. 목적은 정확한 배치가 아니라
 * 지겨움 제거이고, 나머지는 간격 반복이 몇 판 안에 바로잡는다.
 */

import { h } from '../dom.js';
import * as sess from '../../session.js';
import * as fx from '../../feedback.js';
import { renderBody, makeInput } from './play.js';
import * as theme from '../../theme.js';
import * as A from '../../answer.js';

export function placement(go, { skillId } = {}) {
  skillId = skillId || sess.placementSkill();   // 초1은 곱셈구구를 아직 안 배웠다
  const questions = sess.placementQuestions(skillId);
  const results = [];
  let i = 0;
  let askedAt = 0;
  let input = null;

  const pips = h('div', { class: 'pips' });
  const qBox = h('div', { class: 'q' });
  const inputSlot = h('div', {});

  const root = h('div', { class: 'screen sess' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': '건너뛰기', onclick: skip }, '✕'),
      h('div', {},
        h('div', { class: 'h2' }, theme.copy('placementTitle')),
        h('div', { class: 'muted' }, theme.copy('placementHint'))),
    ),
    pips,
    qBox,
    inputSlot,
  );

  function renderPips() {
    pips.replaceChildren();
    for (let k = 0; k < questions.length; k++) {
      let cls = 'pip';
      if (k < results.length) cls += ' ok';        // 맞고 틀림을 아이에게 보여주지 않는다
      else if (k === results.length) cls += ' now';
      pips.append(h('div', { class: cls }));
    }
  }

  function render() {
    const q = questions[i];
    qBox.replaceChildren(h('div', {}, renderBody(q.render)));
    if (input?.destroy) input.destroy();
    input = makeInput(q, answer);
    inputSlot.replaceChildren(input);
    askedAt = Date.now();
    renderPips();
  }

  function answer(given) {
    const q = questions[i];
    const ms = Math.max(200, Date.now() - askedAt);
    const correct = A.check(given, q.answer).correct;
    results.push({ factKey: q.factKey, correct, ms });
    // 진단 중에는 정오답 피드백을 주지 않는다. 틀린 게 계속 보이면 아이가 위축된다.
    fx.tap();
    i += 1;
    if (i >= questions.length) finish(); else render();
  }

  function finish() {
    const r = sess.applyPlacement(skillId, results);
    fx.fanfare();
    const got = results.filter((x) => x.correct).length;

    qBox.replaceChildren(h('div', { style: { textAlign: 'center' } },
      h('div', { style: { fontSize: '46px' } }, '🎈'),
      h('div', { class: 'h1', style: { marginTop: '8px' } }, '다 했어요!'),
      h('div', { class: 'muted', style: { marginTop: '6px' } },
        `${questions.length}개 중 ${got}개 맞았어요`),
    ));

    inputSlot.replaceChildren(
      r.known.length
        ? h('div', { class: 'card', style: { marginBottom: '10px' } },
            h('div', { class: 'h2', style: { marginBottom: '8px' } }, '⭐️ 이미 잘 아는 단'),
            h('div', { class: 'chips' }, r.known.map((l) => h('div', { class: 'chip' }, l))))
        : null,
      r.weak.length
        ? h('div', { class: 'card', style: { marginBottom: '10px' } },
            h('div', { class: 'h2', style: { marginBottom: '8px' } }, '💪 여기부터 같이 해요'),
            h('div', { class: 'chips' }, r.weak.map((l) => h('div', { class: 'chip warn' }, l))))
        : null,
      h('button', { class: 'btn btn-block', onclick: () => go('home') }, '시작하기'),
    );
  }

  function skip() {
    // 건너뛰어도 다시 묻지 않는다. 부모 화면에서 언제든 다시 할 수 있다.
    sess.applyPlacement(skillId, []);
    go('home');
  }

  // 진단 문항이 없는 스킬이면 그냥 넘어간다
  if (!questions.length) { skip(); return root; }

  render();
  return root;
}
