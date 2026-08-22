/** 세션 결과 — 무엇을 얻었는지 아이의 언어로 */

import { h } from '../dom.js';
import * as sess from '../../session.js';

export function result(go, summary) {
  if (!summary) { go('home'); return h('div'); }
  const gen = sess.skill(summary.skillId);
  const all = summary.correct === summary.total;
  const face = all ? '🏆' : summary.correct >= summary.total * 0.7 ? '🎉' : '💪';

  return h('div', { class: 'screen' },
    h('div', { class: 'card result-hero' },
      h('div', { class: 'big' }, face),
      h('div', { class: 'score' }, `${summary.correct} / ${summary.total} 맞았어요`),
      h('div', { class: 'muted' }, all ? '한 문제도 안 틀렸어요!' : '틀린 문제는 다시 만나요'),
    ),

    h('div', { class: 'stat' },
      h('div', { class: 'box' }, h('b', {}, '⭐️ 1'), h('span', {}, '별')),
      h('div', { class: 'box' }, h('b', {}, (summary.avgMs / 1000).toFixed(1) + '초'), h('span', {}, '평균 시간')),
      h('div', { class: 'box' }, h('b', {}, String(summary.fast.length)), h('span', {}, '빠르게 맞힘')),
    ),

    summary.newSticker
      ? h('div', { class: 'card', style: { background: 'var(--sun-l)' } },
          h('div', { class: 'h2' }, `🏅 ${summary.newSticker} 스티커를 받았어요!`),
          h('div', { class: 'muted' }, '이 단은 완전히 외웠어요'))
      : null,

    summary.mastered.length
      ? h('div', { class: 'card' },
          h('div', { class: 'h2', style: { marginBottom: '9px' } }, '⭐️ 완전히 외운 문제'),
          h('div', { class: 'chips' }, summary.mastered.map((k) => h('div', { class: 'chip' }, label(gen, k)))))
      : null,

    summary.fast.length
      ? h('div', { class: 'card' },
          h('div', { class: 'h2', style: { marginBottom: '9px' } }, '⚡️ 빠르게 맞힌 문제'),
          h('div', { class: 'chips' }, summary.fast.map((k) => h('div', { class: 'chip fast' }, label(gen, k)))))
      : null,

    summary.wrong.length
      ? h('div', { class: 'card' },
          h('div', { class: 'h2', style: { marginBottom: '9px' } }, '🔁 다음에 또 만날 문제'),
          h('div', { class: 'chips' }, [...new Set(summary.wrong)].map((k) => h('div', { class: 'chip warn' }, label(gen, k)))))
      : null,

    h('div', { class: 'spacer' }),
    h('button', { class: 'btn btn-block', onclick: () => go('home') }, '홈으로'),
    h('button', { class: 'btn btn-block btn-ghost', onclick: () => go('session', { skillId: summary.skillId }) }, '한 판 더!'),
    h('div', { style: { height: '8px' } }),
  );
}

function label(gen, key) {
  const f = gen.parseFact(key);
  return f.op ? `${f.a} ${f.op} ${f.b}` : `${f.a} × ${f.b}`;
}
