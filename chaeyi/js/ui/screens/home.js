/**
 * 홈 — 지도 · 오늘의 공부 · 주간 도장 · 저금통
 *
 * 스트릭 대신 주간 도장을 쓴다. 초2는 스스로 앱을 못 켠다.
 * 하루 빠졌다고 0으로 리셋되면 거기서 앱 수명이 끝난다.
 *
 * 무엇을 보여줄지는 학년이 정한다. 초1은 곱셈구구를 아직 안 배웠으므로
 * 구구단 지도 대신 받아올림 지도가 메인이다.
 */

import { h } from '../dom.js';
import * as store from '../../state.js';
import * as srs from '../../srs.js';
import * as sess from '../../session.js';
import * as difficulty from '../../difficulty.js';
import * as allowance from '../../allowance.js';
import * as grades from '../../grades.js';
import * as theme from '../../theme.js';

const DAY_LABEL = ['월', '화', '수', '목', '금', '토', '일'];

/** 숙련도는 스킬마다 기준 시간이 다르다 (곱셈구구 3초 / 일차방정식 30초) */
function groupRatio(skillId, facts) {
  const d = store.pdata();
  const targetMs = sess.skillTargetMs(skillId);
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

/** 저금통. 아이에게 별보다 셀 수 있는 보상이라 홈 위쪽에 크게 둔다. */
function piggyCard() {
  if (!allowance.enabled()) return null;
  const c = allowance.config();
  const bal = allowance.balance();
  const pct = Math.round(allowance.progress() * 100);
  const done = allowance.reachedGoal();

  return h('div', { class: 'card piggy' + (done ? ' full' : '') },
    h('div', { class: 'row' },
      h('div', { class: 'piggy-em' }, theme.copy('walletEmoji')),
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

/** 진도 지도. 곱셈구구는 8칸(2~9단), 받아올림은 2칸으로 같은 UI를 쓴다. */
function mapCard(go, skillId) {
  const gen = sess.skill(skillId);
  const list = gen.groups();

  const tiles = list.map((g) => {
    const r = groupRatio(skillId, g.facts);
    const due = sess.dueCount(skillId, g.id);
    const done = r >= 0.95;
    return h('button', {
      class: 'tile' + (done ? ' done' : ''),
      onclick: () => go('session', { skillId, groupId: g.id }),
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
      h('div', { class: 'h2' }, `${gen.emoji} ${gen.mapTitle || gen.title + ' 지도'}`),
      h('div', { class: 'spacer' }),
      h('div', { class: 'muted' }, '칸을 눌러 연습'),
    ),
    h('div', { class: 'map', style: list.length <= 3
      ? { gridTemplateColumns: `repeat(${list.length}, 1fr)` } : {} }, tiles),
  );
}

function skillCard(skillId, go) {
  const gen = sess.skill(skillId);
  const r = groupRatio(skillId, gen.allFacts());
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

function rallyCard(go, skillId) {
  const best = sess.rallyBest(skillId);
  return h('button', { class: 'skill rally-card', onclick: () => go('rally', { skillId }) },
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
    onclick: () => go('placement') },
    h('div', { class: 'em', style: { background: '#fff' } }, '🔎'),
    h('div', { style: { flex: '1' } },
      h('div', { class: 'h2' }, theme.copy('placementTitle')),
      h('div', { class: 'muted' }, '12문항만 풀면 딱 맞는 곳부터 시작해요'),
    ),
    h('div', { class: 'go' }, '›'),
  );
}

export function home(go) {
  const p = store.activeProfile();
  const d = store.pdata();
  const g = grades.of();
  const open = sess.openSkills();
  const main = open.includes(g.mainSkill) ? g.mainSkill : open[0];
  const others = open.filter((id) => id !== main);
  const manyKids = store.profiles().length > 1;

  const resume = d.activeSession;
  const totalDue = open.reduce((sum, id) => sum + sess.dueCount(id), 0);
  const cta = resume
    ? { label: theme.copy('resume'), skillId: resume.skillId, groupId: resume.groupId ?? null }
    : { label: totalDue > 0 ? `${theme.copy('todayStart')} (${totalDue}개 복습)` : theme.copy('todayStart'),
        skillId: main, groupId: null };

  return h('div', { class: 'screen' },
    h('div', { class: 'topbar' },
      // 아이가 여럿이면 얼굴을 눌러 바꾼다
      manyKids
        ? h('button', { class: 'avatar', title: '다른 친구로 바꾸기',
            'aria-label': '다른 친구로 바꾸기', onclick: () => go('who') },
            p.avatar, h('span', { class: 'avatar-swap' }, '⇄'))
        : h('div', { class: 'avatar' }, p.avatar),
      h('div', {},
        h('div', { class: 'who-name' }, `${p.name}${theme.copy('kidSuffix')}`),
        h('div', { class: 'muted' },
          `${g.label} · ${theme.copy('star')} ${d.sessions.length} · ${difficulty.preset().label}`),
      ),
      h('div', { class: 'spacer' }),
      h('button', { class: 'icon-btn', title: '부모님 화면', 'aria-label': '부모님 화면',
        onclick: () => go('parent') }, '👨‍👩‍👧'),
    ),

    h('button', { class: 'btn btn-block',
      onclick: () => go('session', { skillId: cta.skillId, groupId: cta.groupId }) },
      cta.label),

    sess.placementDone() ? null : placementCard(go),
    piggyCard(),
    weekCard(),
    main ? mapCard(go, main) : null,
    main ? rallyCard(go, main) : null,
    others.map((id) => skillCard(id, go)),

    d.stickers.length
      ? h('div', { class: 'card' },
          h('div', { class: 'h2', style: { marginBottom: '10px' } }, theme.copy('stickerBoard')),
          h('div', { class: 'chips' }, d.stickers.map((s) => h('div', { class: 'chip' }, s.label))))
      : null,

    h('div', { style: { height: '8px' } }),
  );
}
