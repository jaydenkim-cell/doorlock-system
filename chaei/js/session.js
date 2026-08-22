/**
 * 세션 엔진 — 10문항 한 판
 *
 * 두 가지를 지킨다.
 *  1) 무엇을 낼지: 복습할 때가 된 것 → 새 것(최대 3개) → 약한 것 순.
 *  2) 중간에 끊겨도 이어서: 답을 하나 낼 때마다, 그리고 새 문제를 낼 때마다
 *     저장한다. 아이 태블릿은 언제든 꺼진다. "내 별 없어졌어" 한 번이면
 *     앱 수명이 끝난다.
 */

import * as store from './state.js';
import * as srs from './srs.js';
import * as multiply from './generators/multiply.js';
import * as addsub from './generators/addsub.js';

export const SKILLS = { [multiply.id]: multiply, [addsub.id]: addsub };

export function skill(skillId) { return SKILLS[skillId]; }

/** 이 스킬에서 지금 복습할 때가 된 문항 수 (홈 화면 배지용) */
export function dueCount(skillId, groupId) {
  const now = Date.now();
  const gen = SKILLS[skillId];
  const group = groupId ? gen.groups().find((g) => g.id === groupId) : null;
  return store.masteryList(skillId)
    .filter((m) => srs.isDue(m, now))
    .filter((m) => !group || group.facts.includes(m.factKey)).length;
}

function buildQueue(skillId, groupId) {
  const gen = SKILLS[skillId];
  const s = store.settings();
  const now = Date.now();
  // 홈에서 "3단"을 콕 집어 눌렀다면 그 단만 낸다.
  const group = groupId ? gen.groups().find((g) => g.id === groupId) : null;
  const all = group ? group.facts : gen.allFacts();

  const recs = new Map();
  for (const m of store.masteryList(skillId)) recs.set(m.factKey, m);

  const due = [];
  const seen = [];
  const fresh = [];
  for (const key of all) {
    const m = recs.get(key);
    if (!m || !m.box) { fresh.push(key); continue; }
    if (srs.isDue(m, now)) due.push([key, m]);
    else seen.push([key, m]);
  }

  due.sort((x, y) => x[1].dueAt - y[1].dueAt);

  // 약한 항목: 정답률이 낮거나 아직 느린 것
  const weakness = ([, m]) => {
    const acc = m.seen ? m.correct / m.seen : 0;
    const slow = m.avgMs > s.targetMs ? m.avgMs / s.targetMs : 1;
    return (1 - acc) * 2 + (slow - 1);
  };
  const weak = seen.filter(([, m]) => (m.seen && m.correct / m.seen < 0.7) || m.avgMs > s.targetMs)
                   .sort((x, y) => weakness(y) - weakness(x));

  const queue = [];
  const take = (list, n) => { for (const [k] of list) { if (queue.length >= n) break; if (!queue.includes(k)) queue.push(k); } };

  take(due, s.sessionLength);
  // 새 항목은 한 판에 최대 3개. 한꺼번에 몰아주면 초2는 무너진다.
  // (단 첫날처럼 복습할 것도 배운 것도 없으면 아래 마지막 채우기에서
  //  새 항목으로 판을 채운다. 그때는 전부 보기 4개짜리로 나간다.)
  for (const k of fresh) {
    if (queue.filter((q) => !recs.get(q)).length >= s.maxNewPerSession) break;
    if (queue.length >= s.sessionLength) break;
    if (!queue.includes(k)) queue.push(k);
  }
  take(weak, s.sessionLength);

  // 그래도 모자라면 박스가 낮은 것부터 채운다
  if (queue.length < s.sessionLength) {
    const rest = seen.sort((x, y) => x[1].box - y[1].box);
    take(rest, s.sessionLength);
  }
  if (queue.length < s.sessionLength) {
    for (const k of fresh) { if (queue.length >= s.sessionLength) break; if (!queue.includes(k)) queue.push(k); }
  }
  return queue.slice(0, s.sessionLength);
}

function boxOf(skillId, factKey) {
  const d = store.pdata();
  return d.mastery[`${skillId}:${factKey}`]?.box ?? 0;
}

function nextQuestion(sess) {
  const key = sess.queue[sess.index] ?? sess.retryQueue[sess.index - sess.queue.length];
  if (!key) return null;
  const gen = SKILLS[sess.skillId];
  return gen.makeQuestion(key, boxOf(sess.skillId, key));
}

/** 진행 중인 세션이 있으면 그대로 이어서, 없으면 새로 만든다 */
export function startOrResume(skillId, groupId = null) {
  const d = store.pdata();
  const a = d.activeSession;
  if (a && a.skillId === skillId && (a.groupId ?? null) === groupId) return a;

  const sess = {
    id: 's' + Date.now().toString(36),
    skillId,
    groupId,
    startedAt: Date.now(),
    queue: buildQueue(skillId, groupId),
    retryQueue: [],
    items: [],
    index: 0,
    question: null,
    questionStartedAt: 0,
  };
  sess.question = nextQuestion(sess);
  sess.questionStartedAt = Date.now();
  d.activeSession = sess;
  store.save();
  return sess;
}

export function active() { return store.pdata()?.activeSession || null; }

export function abandon() {
  const d = store.pdata();
  d.activeSession = null;
  store.save();
}

export function progress(sess) {
  return {
    done: Math.min(sess.index, sess.queue.length),
    total: sess.queue.length,
    bonus: Math.max(0, sess.index - sess.queue.length),
    bonusTotal: sess.retryQueue.length,
  };
}

/**
 * 답 하나를 채점하고 기록한다.
 * @returns {{correct:boolean, answer:number, reason:string|null, ms:number,
 *            promoted:boolean, mastered:boolean, newBest:boolean, done:boolean}}
 */
export function submit(given) {
  const d = store.pdata();
  const sess = d.activeSession;
  const q = sess.question;
  const gen = SKILLS[sess.skillId];
  const s = store.settings();

  const ms = Math.max(200, Date.now() - sess.questionStartedAt);
  const correct = Number(given) === q.answer;
  const reason = correct ? null : gen.diagnose(q.factKey, Number(given), q.ctx);

  const m = store.mastery(sess.skillId, q.factKey);
  const outcome = srs.applyResult(m, { correct, ms, given: Number(given), reason }, s.targetMs, d.bestMs);

  sess.items.push({ factKey: q.factKey, given: Number(given), correct, ms, at: Date.now() });

  // 틀린 문제는 하트를 깎는 대신 이 판이 끝날 때 한 번 더 낸다.
  const inRetry = sess.index >= sess.queue.length;
  if (!correct && !inRetry && !sess.retryQueue.includes(q.factKey)) {
    sess.retryQueue.push(q.factKey);
  }

  sess.index += 1;
  sess.question = nextQuestion(sess);
  sess.questionStartedAt = Date.now();
  const done = !sess.question;
  store.save();

  return { correct, answer: q.answer, reason, ms, ...outcome, done };
}

/** 세션을 마감하고 결과 요약을 돌려준다 */
export function finish() {
  const d = store.pdata();
  const sess = d.activeSession;
  if (!sess) return null;
  const s = store.settings();

  sess.completedAt = Date.now();
  const main = sess.items.slice(0, sess.queue.length);
  const correctCount = main.filter((i) => i.correct).length;

  const masteredNow = [];
  for (const key of new Set(sess.items.map((i) => i.factKey))) {
    const m = store.mastery(sess.skillId, key);
    if (srs.isMastered(m, s.targetMs)) masteredNow.push(key);
  }

  const faster = sess.items
    .filter((i) => i.correct && i.ms <= s.targetMs)
    .map((i) => i.factKey);

  const summary = {
    skillId: sess.skillId,
    total: main.length,
    correct: correctCount,
    retried: sess.retryQueue.length,
    avgMs: main.length ? Math.round(main.reduce((a, i) => a + i.ms, 0) / main.length) : 0,
    fast: [...new Set(faster)],
    mastered: masteredNow,
    wrong: main.filter((i) => !i.correct).map((i) => i.factKey),
    startedAt: sess.startedAt,
    completedAt: sess.completedAt,
  };

  d.sessions.push({ ...sess, question: null, summary });
  if (d.sessions.length > 200) d.sessions = d.sessions.slice(-200);
  d.activeSession = null;

  // 새로 마스터한 단이 있으면 스티커를 준다
  awardStickers(d, sess.skillId, summary);
  store.save();
  return summary;
}

function awardStickers(d, skillId, summary) {
  const gen = SKILLS[skillId];
  const s = store.settings();
  for (const g of gen.groups()) {
    const all = g.facts.every((k) => {
      const m = d.mastery[`${skillId}:${k}`];
      return m && srs.isMastered(m, s.targetMs);
    });
    const tag = `${skillId}:${g.id}`;
    if (all && !d.stickers.some((x) => x.tag === tag)) {
      d.stickers.push({ tag, label: g.label, at: Date.now() });
      summary.newSticker = g.label;
    }
  }
}

// ── 주간 목표 (스트릭 0 리셋 대신) ───────────────────────────────────
export function weekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // 월요일 시작
  return d.getTime();
}

/** 이번 주 요일별 학습 여부 [월..일] */
export function weekStamps() {
  const d = store.pdata();
  const start = weekStart();
  const days = new Array(7).fill(false);
  for (const s of d.sessions) {
    const t = s.completedAt || s.startedAt;
    if (t < start) continue;
    const idx = Math.floor((t - start) / 86400000);
    if (idx >= 0 && idx < 7) days[idx] = true;
  }
  return days;
}
