/** 세션 결과 — 무엇을 얻었는지 아이의 언어로 */

import { h } from '../dom.js';
import * as sess from '../../session.js';
import * as allowance from '../../allowance.js';
import * as theme from '../../theme.js';

export function result(go, summary) {
  // 그리는 도중의 go() 는 바깥 라우터에 덮인다. 다음 프레임으로 미룬다.
  if (!summary) { setTimeout(() => go('home'), 0); return h('div', { class: 'screen' }); }
  const all = summary.correct === summary.total;
  const face = all ? '🏆' : summary.correct >= summary.total * 0.7 ? '🎉' : '💪';

  return h('div', { class: 'screen' },
    h('div', { class: 'card result-hero' },
      h('div', { class: 'big' }, face),
      h('div', { class: 'score' }, `${summary.correct} / ${summary.total} 맞았어요`),
      h('div', { class: 'muted' }, all ? '한 문제도 안 틀렸어요!' : '틀린 문제는 다시 만나요'),
    ),

    h('div', { class: 'stat' },
      h('div', { class: 'box' }, h('b', {}, '+1'), h('span', {}, theme.copy('star'))),
      h('div', { class: 'box' }, h('b', {}, (summary.avgMs / 1000).toFixed(1) + '초'), h('span', {}, '평균 시간')),
      h('div', { class: 'box' }, h('b', {}, String(summary.fast.length)), h('span', {}, '빠르게 맞힘')),
    ),

    (summary.newStickers || []).length
      ? h('div', { class: 'card', style: { background: 'var(--sun-l)' } },
          h('div', { class: 'h2' }, `🏅 ${summary.newStickers.join(', ')} ${theme.copy('sticker')}`),
          h('div', { class: 'muted' }, '이 단은 완전히 외웠어요'))
      : null,

    earnCard(summary),

    summary.mastered.length
      ? h('div', { class: 'card' },
          h('div', { class: 'h2', style: { marginBottom: '9px' } }, '⭐️ 완전히 외운 문제'),
          h('div', { class: 'chips' }, summary.mastered.map((e) => h('div', { class: 'chip' }, label(e)))))
      : null,

    summary.fast.length
      ? h('div', { class: 'card' },
          h('div', { class: 'h2', style: { marginBottom: '9px' } }, '⚡️ 빠르게 맞힌 문제'),
          h('div', { class: 'chips' }, summary.fast.map((e) => h('div', { class: 'chip fast' }, label(e)))))
      : null,

    summary.wrong.length
      ? h('div', { class: 'card' },
          h('div', { class: 'h2', style: { marginBottom: '9px' } }, '🔁 다음에 또 만날 문제'),
          h('div', { class: 'chips' }, summary.wrong.map((e) => h('div', { class: 'chip warn' }, label(e)))))
      : null,

    h('div', { class: 'spacer' }),
    h('button', { class: 'btn btn-block', onclick: () => go('home') }, theme.copy('home')),
    h('button', { class: 'btn btn-block btn-ghost',
      // 방금 푼 것과 같은 종류로 한 판 더. 섞은 판이었으면 또 섞어서.
      onclick: () => go('session', summary.kind === 'op' ? { opId: summary.opId }
                                 : summary.kind === 'mix' ? { skillId: 'mix' }
                                 : { skillId: summary.skillId }) }, theme.copy('again')),
    h('div', { style: { height: '8px' } }),
  );
}

/** 이번 판에 얼마가 쌓였는지. 아이에게는 이게 별보다 셀 수 있는 보상이다. */
function earnCard(summary) {
  if (!allowance.enabled()) return null;
  const got = summary.earned || [];
  const c = allowance.config();
  const total = got.reduce((sum, g) => sum + g.amount, 0);

  if (!got.length) {
    // 하루 상한에 걸렸을 때. 못 받은 게 아니라 오늘 몫을 다 받았다고 말한다.
    return h('div', { class: 'card piggy-row' },
      h('div', { class: 'piggy-em' }, theme.copy('walletEmoji')),
      h('div', { style: { flex: '1' } },
        h('div', { class: 'h2' }, allowance.won(allowance.balance())),
        h('div', { class: 'muted' }, `오늘 저금은 다 했어요 (하루 ${c.dailySessionCap}판까지)`)),
    );
  }

  return h('div', { class: 'card piggy-row', style: { background: 'var(--mint-l)' } },
    h('div', { class: 'piggy-em' }, theme.copy('walletEmoji')),
    h('div', { style: { flex: '1' } },
      h('div', { class: 'h2' }, `+${allowance.won(total)} 저금했어요!`),
      h('div', { class: 'chips', style: { marginTop: '6px' } },
        got.map((g) => h('div', { class: 'chip' }, `${g.note} +${allowance.won(g.amount)}`))),
      h('div', { class: 'muted', style: { marginTop: '6px' } },
        `모두 ${allowance.won(allowance.balance())} · 목표 ${allowance.won(c.goal)}`),
      h('div', { class: 'bar', style: { marginTop: '6px' } },
        h('i', { style: { width: `${Math.round(allowance.progress() * 100)}%`,
                          background: 'var(--mint)' } })),
    ),
  );
}

/**
 * 결과 화면에 문항을 어떻게 적을지.
 * 생성기마다 factKey 모양이 달라서(7x8 / add:2,3 / ax+b=c) 일률적으로 못 쓴다.
 * 곱셈·덧뺄셈만 예쁘게 풀어 쓰고 나머지는 키를 그대로 보여준다.
 *
 * 섞은 판에서는 한 화면에 여러 스킬의 문항이 섞이므로 항목마다 자기 스킬을 들고 온다.
 * (예전 세션 기록에는 skillId 가 없어서 그때는 대표 스킬로 읽는다)
 */
function label(entry) {
  if (typeof entry === 'string') return entry;
  const key = entry.factKey;
  const gen = sess.skill(entry.skillId);
  if (!gen) return key;
  try {
    const f = gen.parseFact(key);
    if (f && f.a !== undefined && f.b !== undefined && !f.kind) {
      return f.op ? `${f.a} ${f.op} ${f.b}` : `${f.a} × ${f.b}`;
    }
  } catch { /* 키 모양이 다른 생성기 */ }
  return key;
}
