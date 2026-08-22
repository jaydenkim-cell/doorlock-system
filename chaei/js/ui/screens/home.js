/**
 * 홈 — 구구단 지도 · 오늘의 공부 · 주간 도장
 *
 * 스트릭 대신 주간 도장을 쓴다. 초2는 스스로 앱을 못 켠다.
 * 하루 빠졌다고 0으로 리셋되면 거기서 앱 수명이 끝난다.
 */

import { h } from '../dom.js';
import * as store from '../../state.js';
import * as srs from '../../srs.js';
import * as sess from '../../session.js';
import * as difficulty from '../../difficulty.js';
import * as allowance from '../../allowance.js';

const DAY_LABEL = ['월', '화', '수', '목', '금', '토', '일'];

function groupRatio(skillId, facts, targetMs) {
  const d = store.pdata();
  let sum = 0;
  for (const k of facts) sum += srs.masteryRatio(d.mastery[`${skillId}:${k}`], targetMs);
  return facts.length ? sum / facts.length : 0;
}

function weekCard() {
  const stamps = sess.weekStamps();
  const goal = store.settings().weeklyGoalDays;
  const done = stamps.filter(Boolean).length;
  const todayIdx = (new Date().getDay() + 6) % 7;

  return h('div', { class: 'card' },
    h('div', { class: 'row', style: { marginBottom: '12px' } },
      h('div', { class: 'h2' }, '이번 주'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'goal' },
        done >= goal ? `목표 달성! ${done}일 🎉` : `${done} / ${goal}일`),
    ),
    h('div', { class: 'week' },
      DAY_LABEL.map((lab, i) => h('div', { class: 'day' },
        h('div', { class: 'dot' + (stamps[i] ? ' on' : '') + (i === todayIdx ? ' today' : '') },
          stamps[i] ? '⭐' : ''),
        h('span', {}, lab),
      )),
    ),
  );
}

function mapCard(go) {
  const gen = sess.skill('mul');
  const targetMs = store.settings().targetMs;

  const tiles = gen.groups().map((g) => {
    const r = groupRatio('mul', g.facts, targetMs);
    const due = sess.dueCount('mul', g.id);
    const done = r >= 0.95;
    return h('button', {
      class: 'tile' + (done ? ' done' : ''),
      onclick: () => go('session', { skillId: 'mul', groupId: g.id }),
      'aria-label': `${g.label} 연습, 숙련도 ${Math.round(r * 100)}퍼센트`,
    },
      h('div', { class: 'fill', style: { height: `${Math.round(r * 100)}%` } }),
      h('div', { class: 'tile-inner' },
        h('div', { class: 'lab' }, g.label),
        h('div', { class: 'sub' }, done ? '마스터' : `${Math.round(r * 100)}%`),
      ),
      due > 0 ? h('div', { class: 'badge' }, String(due)) : null,
    );
  });

  return h('div', { class: 'card' },
    h('div', { class: 'row', style: { marginBottom: '12px' } },
      h('div', { class: 'h2' }, '✖️ 구구단 지도'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'muted' }, '칸을 눌러 연습'),
    ),
    h('div', { class: 'map' }, tiles),
  );
}

function skillCard(skillId, go) {
  const gen = sess.skill(skillId);
  const targetMs = store.settings().targetMs;
  const all = gen.allFacts();
  const r = groupRatio(skillId, all, targetMs);
  const due = sess.dueCount(skillId);

  return h('button', { class: 'skill', onclick: () => go('session', { skillId }) },
    h('div', { class: 'em' }, gen.emoji),
    h('div', { style: { flex: '1' } },
      h('div', { class: 'h2' }, gen.title),
      h('div', { class: 'muted' },
        due > 0 ? `복습할 문제 ${due}개` : `${Math.round(r * 100)}% 익혔어요`),
      h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round(r * 100)}%` } })),
    ),
    h('div', { class: 'go' }, '›'),
  );
}

/** 저금통. 아이에게 별보다 셀 수 있는 보상이라 홈 위쪽에 크게 둔다. */
function piggyCard() {
  const c = allowance.config();
  const bal = allowance.balance();
  const pct = Math.round(allowance.progress() * 100);
  const done = allowance.reachedGoal();

  return h('div', { class: 'card piggy' + (done ? ' full' : '') },
    h('div', { class: 'row' },
      h('div', { class: 'piggy-em' }, '🐷'),
      h('div', { style: { flex: '1' } },
        h('div', { class: 'piggy-amt' }, allowance.won(bal)),
        h('div', { class: 'muted' }, done
          ? '목표를 채웠어요! 부모님께 보여주세요'
          : `목표 ${allowance.won(c.goal)}까지 ${allowance.won(c.goal - bal)} 남았어요`),
      ),
      h('div', { class: 'piggy-pct' }, `${pct}%`),
    ),
    h('div', { class: 'bar', style: { marginTop: '10px' } },
      h('i', { style: { width: `${pct}%`, background: done ? 'var(--sun)' : 'var(--mint)' } })),
  );
}

function rallyCard(go) {
  const best = sess.rallyBest('mul');
  return h('button', { class: 'skill rally-card', onclick: () => go('rally', { skillId: 'mul' }) },
    h('div', { class: 'em', style: { background: 'var(--sky-l)' } }, '⚡️'),
    h('div', { style: { flex: '1' } },
      h('div', { class: 'h2' }, '60초 랠리'),
      h('div', { class: 'muted' }, best ? `최고 기록 ${best}개 — 넘어볼까?` : '60초 안에 몇 개 맞힐 수 있을까?'),
    ),
    h('div', { class: 'go' }, '›'),
  );
}

function placementCard(go) {
  return h('button', { class: 'skill', style: { background: 'var(--sun-l)' },
    onclick: () => go('placement', { skillId: 'mul' }) },
    h('div', { class: 'em', style: { background: '#fff' } }, '🔎'),
    h('div', { style: { flex: '1' } },
      h('div', { class: 'h2' }, '어디까지 아는지 볼까요?'),
      h('div', { class: 'muted' }, '12문항만 풀면 딱 맞는 곳부터 시작해요'),
    ),
    h('div', { class: 'go' }, '›'),
  );
}

export function home(go) {
  const p = store.activeProfile();
  const d = store.pdata();
  const resume = d.activeSession;

  const totalDue = sess.dueCount('mul') + sess.dueCount('addsub');
  const cta = resume
    ? { label: '이어서 하기 ▶︎', skillId: resume.skillId, groupId: resume.groupId ?? null }
    : { label: totalDue > 0 ? `오늘의 공부 시작 (${totalDue}개 복습)` : '오늘의 공부 시작',
        skillId: sess.dueCount('addsub') > sess.dueCount('mul') ? 'addsub' : 'mul', groupId: null };

  return h('div', { class: 'screen' },
    h('div', { class: 'topbar' },
      h('div', { class: 'avatar' }, p.avatar),
      h('div', {},
        h('div', { class: 'who' }, `${p.name} 어린이`),
        h('div', { class: 'muted' },
          `초등 ${p.grade}학년 · 별 ${d.sessions.length}개 · ${difficulty.preset().label}`),
      ),
      h('div', { class: 'spacer' }),
      h('button', { class: 'icon-btn', title: '부모님 화면', 'aria-label': '부모님 화면',
        onclick: () => go('parent') }, '👨‍👩‍👧'),
    ),

    h('button', { class: 'btn btn-block', onclick: () => go('session', { skillId: cta.skillId, groupId: cta.groupId }) },
      cta.label),

    sess.placementDone() ? null : placementCard(go),
    piggyCard(),
    weekCard(),
    mapCard(go),
    rallyCard(go),
    skillCard('addsub', go),

    d.stickers.length
      ? h('div', { class: 'card' },
          h('div', { class: 'h2', style: { marginBottom: '10px' } }, '🏅 모은 스티커'),
          h('div', { class: 'chips' }, d.stickers.map((s) => h('div', { class: 'chip' }, s.label))))
      : null,

    h('div', { style: { height: '8px' } }),
  );
}
