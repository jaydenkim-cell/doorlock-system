/**
 * 60초 랠리
 *
 * 곱셈구구의 목표는 "맞히기"가 아니라 "자동으로 나오기"다. 속도 게임은 그
 * 목표와 정확히 맞는다. 겨룰 상대는 어제의 자기 기록뿐이다.
 *
 * 여기서는 틀려도 아무것도 잃지 않는다 (session.rallyRecord 가 box 를 건드리지
 * 않는다). 속도 게임에서 벌을 주면 아이는 다시 안 누른다.
 */

import { h } from '../dom.js';
import * as sess from '../../session.js';
import * as fx from '../../feedback.js';
import * as allowance from '../../allowance.js';
import { numpad, choices, oxpad } from '../numpad.js';
import { renderBody } from './play.js';

export function rally(go, { skillId = 'mul' } = {}) {
  const gen = sess.skill(skillId);
  const best = sess.rallyBest(skillId);

  let running = false;
  let score = 0;
  let miss = 0;
  let streak = 0;
  let q = null;
  let askedAt = 0;
  let lastVariant = null;
  let endsAt = 0;
  let timer = null;
  let input = null;

  const bar = h('i', {});
  const clock = h('b', {}, '60');
  const scoreEl = h('b', {}, '0');
  const qBox = h('div', { class: 'q' });
  const inputSlot = h('div', {});

  const root = h('div', { class: 'screen sess' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': '나가기', onclick: stop }, '✕'),
      h('div', {},
        h('div', { class: 'h2' }, `⚡️ 60초 랠리 · ${gen.title}`),
        h('div', { class: 'muted' }, best ? `최고 기록 ${best}개` : '첫 도전!')),
    ),
    h('div', { class: 'rally-hud' },
      h('div', { class: 'rally-time' }, clock, h('span', {}, '초')),
      h('div', { class: 'rally-bar' }, bar),
      h('div', { class: 'rally-score' }, scoreEl, h('span', {}, '개')),
    ),
    qBox,
    inputSlot,
  );

  function tick() {
    const left = Math.max(0, endsAt - Date.now());
    clock.textContent = String(Math.ceil(left / 1000));
    bar.style.width = `${(left / (sess.RALLY_SECONDS * 1000)) * 100}%`;
    if (left <= 0) finish();
  }

  function nextQuestion() {
    q = sess.rallyQuestion(skillId, lastVariant);
    lastVariant = q.variant;
    askedAt = Date.now();

    qBox.replaceChildren(h('div', {}, renderBody(q.render)));
    if (input?.destroy) input.destroy();
    if (q.mode === 'choice') input = choices({ options: q.choices, onSubmit: answer });
    else if (q.mode === 'ox') input = oxpad({ onSubmit: answer });
    else input = numpad({ onSubmit: answer, maxLen: 3 });
    inputSlot.replaceChildren(input);
  }

  function answer(given) {
    if (!running) return;
    const ms = Math.max(150, Date.now() - askedAt);
    const correct = sess.rallyRecord(skillId, q, given, ms);

    if (correct) {
      score += 1; streak += 1;
      scoreEl.textContent = String(score);
      qBox.classList.add('pop');
      setTimeout(() => qBox.classList.remove('pop'), 200);
      if (streak > 0 && streak % 5 === 0) fx.zap(); else fx.correct();
    } else {
      miss += 1; streak = 0;
      qBox.classList.add('shake');
      setTimeout(() => qBox.classList.remove('shake'), 300);
      fx.wrong();
    }
    // 랠리는 멈추지 않는다. 바로 다음 문제.
    nextQuestion();
  }

  function start() {
    running = true;
    endsAt = Date.now() + sess.RALLY_SECONDS * 1000;
    timer = setInterval(tick, 100);
    nextQuestion();
    tick();
  }

  function stop() {
    running = false;
    clearInterval(timer);
    if (input?.destroy) input.destroy();
    go('home');
  }

  function finish() {
    running = false;
    clearInterval(timer);
    if (input?.destroy) input.destroy();
    const r = sess.rallyFinish(skillId, score);
    if (r.isBest) fx.fanfare(); else fx.correct();

    qBox.replaceChildren(h('div', { style: { textAlign: 'center' } },
      h('div', { style: { fontSize: '46px' } }, r.isBest ? '🏆' : '⏱'),
      h('div', { class: 'score', style: { fontSize: '34px', fontWeight: '800' } }, `${score}개`),
      h('div', { class: 'muted' }, r.isBest
        ? `새 최고 기록! (지난 기록 ${r.prev}개)`
        : `최고 기록은 ${r.best}개예요`),
      r.earned
        ? h('div', { class: 'chip', style: { marginTop: '10px', display: 'inline-block' } },
            `🐷 +${allowance.won(r.earned.amount)}`)
        : null,
    ));
    inputSlot.replaceChildren(
      h('button', { class: 'btn btn-block', onclick: () => { reset(); start(); } }, '한 번 더!'),
      h('div', { style: { height: '10px' } }),
      h('button', { class: 'btn btn-block btn-ghost', onclick: () => go('home') }, '홈으로'),
    );
    clock.textContent = '0';
    bar.style.width = '0%';
  }

  function reset() {
    score = 0; miss = 0; streak = 0; lastVariant = null;
    scoreEl.textContent = '0';
  }

  // 시작 전 안내. 갑자기 타이머가 돌면 아이가 첫 몇 초를 놓친다.
  qBox.replaceChildren(h('div', { style: { textAlign: 'center' } },
    h('div', { style: { fontSize: '46px' } }, '⚡️'),
    h('div', { class: 'h1', style: { marginTop: '8px' } }, '60초 안에 몇 개?'),
    h('div', { class: 'muted' }, '틀려도 별은 안 없어져요. 마음껏 해봐요!'),
  ));
  inputSlot.replaceChildren(
    h('button', { class: 'btn btn-block', onclick: () => { reset(); start(); } }, '시작!'),
  );

  root.destroy = () => clearInterval(timer);
  return root;
}
