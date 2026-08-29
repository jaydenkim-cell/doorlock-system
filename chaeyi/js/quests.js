/**
 * 오늘의 미션 — 매일 세 가지
 *
 * "오늘 왜 켜야 하는가"에 답하는 장치다. 진도는 어제와 오늘이 구별되지 않지만
 * 미션은 오늘 것이 따로 있어서, 아이에게 하루의 끝이 생긴다.
 *
 * 듀오링고의 스트릭과 다른 점이 하나 있다 — **못 지킨 날에 잃는 것이 없다.**
 * 어제 미션을 놓쳤다고 오늘 화면에 빨간 표시가 뜨지 않는다. 초2는 스스로 앱을
 * 못 켠다. 부모가 바빴던 날의 책임을 아이에게 돌리면 그날로 앱이 끝난다.
 *
 * 미션은 매일 같은 세 가지로 둔다. 무작위로 돌리면 "오늘은 뭐지" 를 읽어야 하는데,
 * 초2는 지시문을 안 읽는다. 늘 같은 세 칸이 채워지는 편이 훨씬 잘 통한다.
 */

import * as store from './state.js';
import * as points from './points.js';

export const QUESTS = [
  { id: 'play',   emoji: '📘', label: '한 판 끝내기',    hint: '오늘의 공부 한 번' },
  { id: 'streak', emoji: '🔥', label: '5개 연속 맞히기', hint: '한 판 안에서' },
  { id: 'fast',   emoji: '⚡️', label: '빠르게 3개 맞히기', hint: '목표 시간 안에' },
];

function todayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function board() {
  const d = store.pdata();
  const key = todayKey();
  // 날짜가 바뀌면 새 판. 어제 것은 남기지 않는다 — 밀린 숙제로 보이면 안 된다.
  if (!d.quests || d.quests.date !== key) {
    d.quests = { date: key, done: [], bonusPaid: false };
  }
  return d.quests;
}

export function state() {
  const b = board();
  return QUESTS.map((q) => ({ ...q, done: b.done.includes(q.id) }));
}

export function doneCount() { return board().done.length; }
export function allDone() { return board().done.length >= QUESTS.length; }

/** 이미 보너스까지 받았는가 (홈에서 축하 표시를 한 번만 하려고) */
export function bonusPaid() { return !!board().bonusPaid; }

function complete(id) {
  const b = board();
  if (b.done.includes(id)) return false;
  b.done.push(id);
  return true;
}

/**
 * 한 판이 끝났을 때 미션 진행을 갱신한다.
 * @returns {{newly:string[], bonus:object|null}} 이번에 새로 깬 미션과 전부 깬 보너스
 */
export function recordSession(summary) {
  const newly = [];
  if (summary.total > 0 && complete('play')) newly.push('play');
  if ((summary.bestStreak || 0) >= 5 && complete('streak')) newly.push('streak');
  if ((summary.fast || []).length >= 3 && complete('fast')) newly.push('fast');

  let bonus = null;
  const b = board();
  if (allDone() && !b.bonusPaid) {
    b.bonusPaid = true;
    bonus = points.award('questAll', points.RULES.questAll);
  }
  store.save();
  return { newly, bonus };
}

/** 랠리도 "빠르게 맞히기" 미션을 채운다 — 그게 정확히 랠리가 하는 일이다 */
export function recordRally(score) {
  const newly = [];
  if (score >= 3 && complete('fast')) newly.push('fast');
  let bonus = null;
  const b = board();
  if (allDone() && !b.bonusPaid) {
    b.bonusPaid = true;
    bonus = points.award('questAll', points.RULES.questAll);
  }
  store.save();
  return { newly, bonus };
}
