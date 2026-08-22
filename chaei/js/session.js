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
import * as difficulty from './difficulty.js';
import * as allowance from './allowance.js';
import * as grades from './grades.js';
import * as multiply from './generators/multiply.js';
import * as addsub from './generators/addsub.js';

export const SKILLS = { [multiply.id]: multiply, [addsub.id]: addsub };

export function skill(skillId) { return SKILLS[skillId]; }

/** 지금 프로필의 학년에서 열려 있는 스킬 목록 */
export function openSkills() {
  return grades.of().skills.filter((id) => SKILLS[id]);
}

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
  const freshSet = new Set();
  for (const key of all) {
    const m = recs.get(key);
    if (!m || !m.box) { freshSet.add(key); continue; }
    if (srs.isDue(m, now)) due.push([key, m]);
    else seen.push([key, m]);
  }
  // 새로 배울 것은 allFacts() 순서(2단→3단→…)가 아니라 학습 순서로 꺼낸다.
  // 그 순서를 그대로 쓰면 아이가 매 판 같은 단만 행진하게 된다.
  const fresh = (gen.newFactOrder ? gen.newFactOrder() : all).filter((k) => freshSet.has(k));

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
  return arrange(queue.slice(0, s.sessionLength), freshSet);
}

/**
 * 순서를 섞는다. 1차에서 반복감의 직접 원인이 이 셔플의 부재였다.
 * 다만 완전 무작위로 두지는 않는다 — 처음 배우는 항목은 앞쪽 70% 안에 오게 한다.
 * 아이가 지친 뒤에 새로운 걸 가르치면 안 된다.
 */
function arrange(queue, freshSet) {
  const shuffled = shuffle(queue);
  const early = shuffled.filter((k) => freshSet.has(k));
  const late = shuffled.filter((k) => !freshSet.has(k));
  // 전부 새 항목이거나 전부 복습이면 섞을 것이 없다 (첫날이 이 경우다)
  if (!early.length || !late.length) return shuffled;

  const n = shuffled.length;
  // 새 항목이 앞 70% 보다 많으면 그만큼 구간을 넓힌다. 안 그러면 자리가 모자라 항목이 사라진다.
  const cutoff = Math.max(early.length, Math.ceil(n * 0.7));
  const slots = shuffle(Array.from({ length: cutoff }, (_, i) => i))
    .slice(0, early.length)
    .sort((x, y) => x - y);

  const out = new Array(n).fill(null);
  slots.forEach((slot, i) => { out[slot] = early[i]; });
  let li = 0;
  for (let i = 0; i < n; i++) if (out[i] === null) out[i] = late[li++];
  return out;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function boxOf(skillId, factKey) {
  const d = store.pdata();
  return d.mastery[`${skillId}:${factKey}`]?.box ?? 0;
}

function nextQuestion(sess) {
  const key = sess.queue[sess.index] ?? sess.retryQueue[sess.index - sess.queue.length];
  if (!key) return null;
  const gen = SKILLS[sess.skillId];
  const level = difficulty.levelOf(sess.skillId);
  // 직전 문항과 같은 형태는 피한다. 연속 두 번이면 다양해진 느낌이 사라진다.
  const variant = difficulty.pickVariant(gen, key, level, sess.lastVariant);
  // 학년에 따라 덧뺄셈을 한 자리로 낼지 두 자리로 감쌀지가 갈린다
  const q = gen.makeQuestion(key, boxOf(sess.skillId, key), variant, grades.questionOpts());
  sess.lastVariant = q.variant;
  return q;
}

/** 진행 중인 세션이 있으면 그대로 이어서, 없으면 새로 만든다 */
export function startOrResume(skillId, groupId = null) {
  const d = store.pdata();
  const a = d.activeSession;
  if (a && a.skillId === skillId && (a.groupId ?? null) === groupId) return a;

  const sess = {
    id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    skillId,
    groupId,
    startedAt: Date.now(),
    queue: buildQueue(skillId, groupId),
    retryQueue: [],
    items: [],
    index: 0,
    question: null,
    questionStartedAt: 0,
    streak: 0,        // 연속 정답 (콤보)
    bestStreak: 0,
    lastVariant: null,
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

  sess.items.push({ factKey: q.factKey, given: Number(given), correct, ms,
                    variant: q.variant, at: Date.now() });

  // 콤보. 3·5·10 에서 반응을 키운다.
  sess.streak = correct ? sess.streak + 1 : 0;
  sess.bestStreak = Math.max(sess.bestStreak, sess.streak);
  const milestone = correct && [3, 5, 10, 15, 20].includes(sess.streak) ? sess.streak : 0;

  // 난이도 레벨은 최근 성적을 보고 스스로 오르내린다
  const lv = difficulty.record(sess.skillId, { correct, fast: srs.isFast(ms, s.targetMs) });

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

  return { correct, answer: q.answer, reason, ms, ...outcome, done,
           variant: q.variant, streak: sess.streak, milestone,
           level: lv.level, levelChanged: lv.changed };
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
    newStickers: [],
    bestStreak: sess.bestStreak,
    variants: [...new Set(sess.items.map((i) => i.variant).filter(Boolean))],
    level: difficulty.levelOf(sess.skillId),
    startedAt: sess.startedAt,
    completedAt: sess.completedAt,
  };

  d.sessions.push({ ...sess, question: null, summary });
  if (d.sessions.length > 200) d.sessions = d.sessions.slice(-200);
  d.activeSession = null;

  // 새로 마스터한 단이 있으면 스티커를 준다
  awardStickers(d, sess.skillId, summary);
  store.save();

  // 용돈 적립은 세션이 확정된 뒤에. 주간 목표는 이번 판을 포함해 계산한다.
  const goalDays = store.settings().weeklyGoalDays;
  summary.earned = allowance.awardForSession(summary, {
    weeklyGoalMet: weekStamps().filter(Boolean).length >= goalDays,
  });
  summary.balance = allowance.balance();
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
      summary.newStickers.push(g.label);
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


// ── 60초 랠리 ────────────────────────────────────────────────────────
// 곱셈구구의 목표는 "맞히기"가 아니라 "자동으로 나오기"다. 속도 게임은 그 목표와
// 정확히 맞는다. 다만 **틀려도 box 를 강등하지 않는다** — 하트를 없앤 것과 같은
// 이유로, 속도 게임에서 벌을 주면 아이는 다시 안 누른다.

export const RALLY_SECONDS = 60;

export function rallyQuestion(skillId, prevVariant) {
  const gen = SKILLS[skillId];
  const d = store.pdata();
  // 처음 보는 문제로 속도 게임을 시키면 안 된다. 만나 본 것 위주로 낸다.
  const seen = gen.allFacts().filter((k) => (d.mastery[`${skillId}:${k}`]?.box ?? 0) > 0);
  const pool = seen.length >= 8 ? seen : gen.allFacts();
  const key = pool[Math.floor(Math.random() * pool.length)];
  const level = difficulty.levelOf(skillId);
  const variant = difficulty.pickVariant(gen, key, level, prevVariant);
  return gen.makeQuestion(key, 1, variant, grades.questionOpts()); // box 1 → 직접 입력
}

export function rallyRecord(skillId, q, given, ms) {
  const correct = Number(given) === q.answer;
  const m = store.mastery(skillId, q.factKey);
  m.seen += 1;
  if (correct) {
    m.correct += 1;
    m.avgMs = m.avgMs ? Math.round(m.avgMs * 0.8 + ms * 0.2) : ms;
    const d = store.pdata();
    const prev = d.bestMs[q.factKey];
    if (!prev || ms < prev) d.bestMs[q.factKey] = ms;
  }
  // box 와 dueAt 은 건드리지 않는다
  store.save();
  return correct;
}

export function rallyFinish(skillId, score) {
  const d = store.pdata();
  if (!d.rally) d.rally = {};
  const prev = d.rally[skillId]?.best || 0;
  const isBest = score > prev;
  d.rally[skillId] = { best: Math.max(prev, score), last: score, at: Date.now() };
  store.save();
  const earned = isBest ? allowance.awardForRally() : null;
  return { best: d.rally[skillId].best, prev, isBest, earned };
}

export function rallyBest(skillId) {
  return store.pdata().rally?.[skillId]?.best || 0;
}

// ── 첫 판 진단 ───────────────────────────────────────────────────────
// 아는 아이에게 2×1부터 가르치는 지겨움을 없애는 것이 목적이다.
// 한 문항으로 그 단 전체를 추론하므로 정확하진 않다. 보수적으로 채우고
// 나머지는 간격 반복이 몇 판 안에 바로잡는다.

const PLACEMENT_FAST_MS = 4000;

/** 진단에 쓸 스킬은 학년이 정한다 (초1은 곱셈구구를 아직 안 배웠다) */
export function placementSkill() {
  return grades.of().placementSkill;
}

export function placementQuestions(skillId = placementSkill()) {
  const gen = SKILLS[skillId];
  return gen.placementFacts().map((k) => gen.makeQuestion(k, 0, 'basic', grades.questionOpts()));
}

/**
 * @param {Array<{factKey:string, correct:boolean, ms:number}>} results
 * @returns {{seeded:number, known:string[], weak:string[]}}
 */
export function applyPlacement(skillId, results) {
  skillId = skillId || placementSkill();
  const gen = SKILLS[skillId];
  const byGroup = new Map();
  for (const g of gen.groups()) byGroup.set(g.id, { group: g, hits: [] });
  for (const r of results) {
    for (const { group, hits } of byGroup.values()) {
      if (group.facts.includes(r.factKey)) hits.push(r);
    }
  }

  const now = Date.now();
  const known = [];
  const weak = [];
  let seeded = 0;

  for (const { group, hits } of byGroup.values()) {
    if (!hits.length) continue;
    const allRight = hits.every((h) => h.correct);
    const allFast = hits.every((h) => h.ms <= PLACEMENT_FAST_MS);

    let box = 0;
    if (allRight && allFast) box = 2;
    else if (hits.some((h) => h.correct)) box = 1;

    if (box === 0) { weak.push(group.label); continue; }
    known.push(group.label);

    for (const key of group.facts) {
      const m = store.mastery(skillId, key);
      if (m.seen) continue;                 // 이미 풀어 본 것은 건드리지 않는다
      m.box = box;
      m.dueAt = srs.dueAtFor(box, now);
      seeded += 1;
    }
  }

  const d = store.pdata();
  d.placementDone = true;
  store.save();
  return { seeded, known, weak };
}

export function placementDone() {
  return !!store.pdata().placementDone;
}

export function resetPlacement() {
  store.pdata().placementDone = false;
  store.save();
}
