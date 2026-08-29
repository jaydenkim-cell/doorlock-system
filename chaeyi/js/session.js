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
import * as answer from './answer.js';
import * as ops from './ops.js';
import * as points from './points.js';
import * as quests from './quests.js';
import * as cosmetics from './cosmetics.js';
import * as multiply from './generators/multiply.js';
import * as addsub from './generators/addsub.js';
import * as divide from './generators/divide.js';
import * as fraction from './generators/fraction.js';
import * as decimalGen from './generators/decimal.js';
import * as factors from './generators/factors.js';
import * as integers from './generators/integers.js';
import * as linear from './generators/linear.js';
import * as simul from './generators/simul.js';
import * as quadratic from './generators/quadratic.js';

export const SKILLS = Object.fromEntries(
  [multiply, addsub, divide, fraction, decimalGen, factors,
   integers, linear, simul, quadratic].map((g) => [g.id, g]),
);

// 연산 분류가 생성기 표를 봐야 한다. import 로 가져가면 순환이라 등록으로 넘긴다.
ops.register(SKILLS);

/**
 * 이 스킬의 목표 응답 시간.
 *
 * 곱셈구구는 3초 자동화가 목표지만 일차방정식은 30초에 푸는 게 정상이다.
 * 하나의 targetMs 로 둘 다 재면 중학 내용은 영원히 마스터가 안 된다.
 * 생성기가 자기 기준을 갖고, 난이도 프리셋은 배수로만 작용한다.
 */
export function skillTargetMs(skillId) {
  const gen = SKILLS[skillId];
  const base = gen?.targetMs || store.settings().targetMs || 3000;
  return Math.round(base * (difficulty.preset().speed ?? 1));
}

export function skill(skillId) { return SKILLS[skillId]; }

/**
 * 지금 프로필에서 열려 있는 스킬 목록.
 * 학년이 정한 것 + 부모가 연산을 따로 켜서 딸려 오는 것.
 */
export function openSkills() {
  const base = grades.of().skills.filter((id) => SKILLS[id]);
  const extra = ops.extraSkills().filter((id) => !base.includes(id));
  return [...base, ...extra];
}

/** 지금 켜져 있는 연산 (＋ − × ÷ 중) */
export function openOps() { return ops.enabled(); }

/**
 * 한 연산의 문항을 (스킬, factKey) 쌍으로 모은다.
 * 받아올림·받아내림처럼 한 스킬이 두 연산에 걸치는 경우가 많아서
 * 스킬이 아니라 문항 단위로 가른다.
 */
export function opFacts(opId) {
  const out = [];
  for (const { skillId, facts } of ops.sources(opId, openSkills())) {
    for (const factKey of facts) out.push({ skillId, factKey });
  }
  return out;
}

/** 이 연산에서 지금 복습할 때가 된 문항 수 */
export function opDueCount(opId) {
  const now = Date.now();
  const d = store.pdata();
  return opFacts(opId)
    .filter(({ skillId, factKey }) => srs.isDue(d.mastery[`${skillId}:${factKey}`], now)).length;
}

/** 이 연산의 숙련도 0~1 (홈의 연산 칸에 채워지는 높이) */
export function opRatio(opId) {
  const d = store.pdata();
  const list = opFacts(opId);
  if (!list.length) return 0;
  let sum = 0;
  for (const { skillId, factKey } of list) {
    sum += srs.masteryRatio(d.mastery[`${skillId}:${factKey}`], skillTargetMs(skillId));
  }
  return sum / list.length;
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

/**
 * 한 스킬(또는 그 안의 한 단)에서 낼 만한 문항을 우선순위별로 갈라 놓는다.
 *
 * 5차까지는 이 함수가 곧 큐였다. 이제 연산 섞어내기가 여러 스킬에서 조금씩
 * 가져가야 해서, "고르는 일"과 "몇 개씩 담는 일"을 나눈다.
 *
 * @returns {{due:string[], fresh:string[], weak:string[], rest:string[], freshSet:Set}}
 */
function candidates(skillId, factList) {
  const gen = SKILLS[skillId];
  const now = Date.now();
  const all = factList || gen.allFacts();
  const allSet = new Set(all);

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
  const fresh = (gen.newFactOrder ? gen.newFactOrder() : all)
    .filter((k) => freshSet.has(k) && allSet.has(k));

  due.sort((x, y) => x[1].dueAt - y[1].dueAt);

  // 약한 항목: 정답률이 낮거나 아직 느린 것
  const target = skillTargetMs(skillId);
  const weakness = ([, m]) => {
    const acc = m.seen ? m.correct / m.seen : 0;
    const slow = m.avgMs > target ? m.avgMs / target : 1;
    return (1 - acc) * 2 + (slow - 1);
  };
  const weak = seen.filter(([, m]) => (m.seen && m.correct / m.seen < 0.7) || m.avgMs > target)
                   .sort((x, y) => weakness(y) - weakness(x));
  const rest = seen.slice().sort((x, y) => x[1].box - y[1].box);

  const keys = (list) => list.map(([k]) => k);
  return { due: keys(due), fresh, weak: keys(weak), rest: keys(rest), freshSet };
}

/** 후보 묶음을 우선순위 한 줄로 편다 (복습할 때가 된 것 → 새 것 → 약한 것 → 나머지) */
function ranked(c) {
  const out = [];
  for (const list of [c.due, c.fresh, c.weak, c.rest]) {
    for (const k of list) if (!out.includes(k)) out.push(k);
  }
  return out;
}

/** 큐 항목은 {skillId, factKey}. 예전에 저장된 세션은 문자열만 들어 있다. */
function entryOf(sess, v) {
  return typeof v === 'string' ? { skillId: sess.skillId, factKey: v } : v;
}

function isFresh(skillId, factKey) {
  return !(store.pdata().mastery[`${skillId}:${factKey}`]?.box);
}

/** 스킬 하나짜리 판 (홈에서 "3단"을 콕 집어 눌렀을 때가 이 경우다) */
function buildSkillQueue(skillId, groupId) {
  const gen = SKILLS[skillId];
  const s = store.settings();
  const group = groupId ? gen.groups().find((g) => g.id === groupId) : null;
  const c = candidates(skillId, group ? group.facts : null);

  const queue = [];
  const push = (k) => { if (!queue.includes(k)) queue.push(k); };

  for (const k of c.due) { if (queue.length >= s.sessionLength) break; push(k); }
  // 새 항목은 한 판에 최대 3개. 한꺼번에 몰아주면 초2는 무너진다.
  // (단 첫날처럼 복습할 것도 배운 것도 없으면 아래 마지막 채우기에서
  //  새 항목으로 판을 채운다. 그때는 전부 보기 4개짜리로 나간다.)
  for (const k of c.fresh) {
    if (queue.filter((q) => c.freshSet.has(q)).length >= s.maxNewPerSession) break;
    if (queue.length >= s.sessionLength) break;
    push(k);
  }
  for (const list of [c.weak, c.rest, c.fresh]) {
    for (const k of list) { if (queue.length >= s.sessionLength) break; push(k); }
  }

  const cut = queue.slice(0, s.sessionLength);
  return arrange(cut.map((k) => ({ skillId, factKey: k })),
                 (e) => c.freshSet.has(e.factKey));
}

/**
 * 연산을 섞은 판 — 이번 6차의 핵심.
 *
 * 아이가 "곱셈만 나온다"고 한 것은 정확한 관찰이었다. 판 하나가 스킬 하나에
 * 묶여 있었고, 초2의 메인 스킬이 곱셈구구였기 때문이다.
 *
 * 이제 연산별로 후보를 뽑아 **한 개씩 돌아가며** 담는다. 우선순위(복습 → 새 것 →
 * 약한 것)는 연산 **안에서** 지켜지고, 연산 **사이**는 균등해진다. 그래서
 * 곱셈에 복습거리가 산더미여도 한 판에서 덧셈·뺄셈이 사라지지 않는다.
 *
 * @param {string[]} opIds 담을 연산들
 */
function buildMixedQueue(opIds) {
  const s = store.settings();
  const lanes = [];

  for (const opId of opIds) {
    // 한 연산의 문항이 여러 스킬에 흩어져 있을 수 있다 (분수 ＋ 와 소수 ＋ 처럼).
    // 스킬별로 후보를 뽑은 뒤 그 안에서도 번갈아 담는다.
    const perSkill = [];
    for (const { skillId, facts } of ops.sources(opId, openSkills())) {
      const c = candidates(skillId, facts);
      perSkill.push(ranked(c).map((k) => ({ skillId, factKey: k })));
    }
    const lane = interleave(perSkill);
    if (lane.length) lanes.push(lane);
  }
  if (!lanes.length) return [];

  const queue = [];
  const has = (e) => queue.some((x) => x.skillId === e.skillId && x.factKey === e.factKey);
  let newCount = 0;
  const cursors = lanes.map(() => 0);

  // 연산을 한 바퀴씩 돌며 하나씩. 다 담을 때까지, 혹은 더 꺼낼 것이 없을 때까지.
  let guard = 0;
  while (queue.length < s.sessionLength && guard++ < 500) {
    let moved = false;
    for (let i = 0; i < lanes.length && queue.length < s.sessionLength; i++) {
      const lane = lanes[i];
      while (cursors[i] < lane.length) {
        const e = lane[cursors[i]++];
        if (has(e)) continue;
        const fresh = isFresh(e.skillId, e.factKey);
        // 새 항목 상한은 판 전체에 하나. 연산마다 3개씩이면 초2는 무너진다.
        if (fresh && newCount >= s.maxNewPerSession && queue.length < s.sessionLength) {
          // 상한에 걸린 새 항목은 건너뛰고 이 연산의 다음 후보를 본다
          continue;
        }
        queue.push(e);
        if (fresh) newCount += 1;
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }

  // 복습거리가 모자라 판이 안 차면 그때는 새 항목 상한을 푼다. 빈 판보다는 낫다.
  if (queue.length < s.sessionLength) {
    for (const lane of lanes) {
      for (const e of lane) {
        if (queue.length >= s.sessionLength) break;
        if (!has(e)) queue.push(e);
      }
    }
  }

  return arrange(queue.slice(0, s.sessionLength), (e) => isFresh(e.skillId, e.factKey));
}

/** 여러 줄을 하나씩 번갈아 하나로 편다 */
function interleave(lists) {
  const out = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const l of lists) if (i < l.length) out.push(l[i]);
  }
  return out;
}

/**
 * 순서를 섞는다. 3차에서 반복감의 직접 원인이 이 셔플의 부재였다.
 * 다만 완전 무작위로 두지는 않는다 — 처음 배우는 항목은 앞쪽 70% 안에 오게 한다.
 * 아이가 지친 뒤에 새로운 걸 가르치면 안 된다.
 */
function arrange(queue, isNew) {
  const shuffled = shuffle(queue);
  const early = shuffled.filter(isNew);
  const late = shuffled.filter((e) => !isNew(e));
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
  const raw = sess.queue[sess.index] ?? sess.retryQueue[sess.index - sess.queue.length];
  if (!raw) return null;
  // 섞어내기 판에서는 문항마다 스킬이 다르다. 난이도 레벨도 그 스킬의 것을 쓴다.
  const { skillId, factKey } = entryOf(sess, raw);
  const gen = SKILLS[skillId];
  const level = difficulty.levelOf(skillId);
  // 직전 문항과 같은 형태는 피한다. 연속 두 번이면 다양해진 느낌이 사라진다.
  const variant = difficulty.pickVariant(gen, factKey, level, sess.lastVariant);
  // 학년에 따라 덧뺄셈을 한 자리로 낼지 두 자리로 감쌀지가 갈린다
  const q = gen.makeQuestion(factKey, boxOf(skillId, factKey), variant, grades.questionOpts());
  sess.lastVariant = q.variant;
  return q;
}

/**
 * 판 하나의 정체. 셋 중 하나다.
 *   { kind:'mix' }                    연산을 모두 섞은 "오늘의 공부"
 *   { kind:'op',   opId:'add' }       한 연산만 (홈의 ＋ 칸)
 *   { kind:'skill', skillId, groupId } 한 스킬 / 한 단 (기존 지도 칸)
 */
export function specOf({ skillId = null, groupId = null, opId = null } = {}) {
  if (opId) return { kind: 'op', opId, skillId: null, groupId: null };
  if (!skillId || skillId === 'mix') return { kind: 'mix', opId: null, skillId: null, groupId: null };
  return { kind: 'skill', skillId, groupId: groupId ?? null, opId: null };
}

function sameSpec(a, b) {
  // 예전에 저장된 세션에는 kind 가 없다. 그때는 스킬 판이었다.
  const kind = a.kind || 'skill';
  if (kind !== b.kind) return false;
  // 섞은 판·연산 판의 `skillId` 는 결과 화면용 대표 스킬일 뿐이라 정체성이 아니다.
  // 그걸 비교하면 이어서 하기가 매번 어긋나 새 판이 만들어진다.
  if (kind === 'mix') return true;
  if (kind === 'op') return (a.opId ?? null) === b.opId;
  return (a.skillId ?? null) === b.skillId && (a.groupId ?? null) === b.groupId;
}

/** 이 판에 쓸 큐를 만든다 */
function buildQueue(spec) {
  if (spec.kind === 'skill') return buildSkillQueue(spec.skillId, spec.groupId);
  const opIds = spec.kind === 'op' ? [spec.opId] : openOps();
  const q = buildMixedQueue(opIds);
  // 켜진 연산에서 낼 것이 하나도 없으면(설정이 엇나간 경우) 메인 스킬로 물러선다
  if (q.length) return q;
  const fallback = openSkills()[0];
  return fallback ? buildSkillQueue(fallback, null) : [];
}

/** 결과·랠리 화면이 쓸 대표 스킬. 섞은 판은 가장 많이 나온 스킬로 잡는다. */
function leadSkill(spec, queue) {
  if (spec.kind === 'skill') return spec.skillId;
  const count = new Map();
  for (const e of queue) count.set(e.skillId, (count.get(e.skillId) || 0) + 1);
  let best = openSkills()[0] || null, n = -1;
  for (const [k, v] of count) if (v > n) { best = k; n = v; }
  return best;
}

/** 진행 중인 세션이 있으면 그대로 이어서, 없으면 새로 만든다 */
export function startOrResume(skillId = null, groupId = null, opId = null) {
  const d = store.pdata();
  const spec = specOf({ skillId, groupId, opId });
  const a = d.activeSession;
  if (a && sameSpec(a, spec)) {
    // 저장된 문제가 비어 있는데 큐는 아직 남은 경우 (저장이 어긋난 아주 드문 상태).
    // 그냥 돌려주면 play.js 가 "다 풀었다"고 보고 판을 닫아 버린다 — 남은 문항이
    // 통째로 사라지는 길이라, 여기서 다음 문제를 다시 만들어 준다.
    if (!a.question && a.index < a.queue.length + a.retryQueue.length) {
      a.question = nextQuestion(a);
      a.questionStartedAt = Date.now();
      store.save();
    }
    return a;
  }

  const queue = buildQueue(spec);
  const sess = {
    id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    kind: spec.kind,
    opId: spec.opId,
    skillId: spec.kind === 'skill' ? spec.skillId : leadSkill(spec, queue),
    groupId: spec.groupId,
    startedAt: Date.now(),
    queue,
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

/**
 * 진행 중인 판을 **그대로** 다시 열기 위한 라우트 파라미터.
 *
 * 홈의 "이어서 하기" 가 대표 스킬만 넘기면, 섞은 판이 스킬 판으로 해석돼
 * 판정이 어긋나고 새 판이 만들어진다 — 풀던 문항이 통째로 날아간다.
 * 어떤 종류의 판이었는지는 세션 자신만 알고 있으니 여기서 되돌려 준다.
 */
export function resumeParams() {
  const a = active();
  if (!a) return null;
  const kind = a.kind || 'skill';
  if (kind === 'op') return { skillId: null, groupId: null, opId: a.opId };
  if (kind === 'mix') return { skillId: 'mix', groupId: null, opId: null };
  return { skillId: a.skillId, groupId: a.groupId ?? null, opId: null };
}

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
  // 섞은 판에서는 문항마다 스킬이 다르다. 채점·목표시간·숙련도는 전부
  // **그 문항의** 스킬 기준이어야 한다 (곱셈 3초 / 나눗셈 12초).
  const skillId = q.skillId || sess.skillId;
  const gen = SKILLS[skillId];
  const s = store.settings();

  const ms = Math.max(200, Date.now() - sess.questionStartedAt);
  const target = skillTargetMs(skillId);
  const verdict = answer.check(given, q.answer);
  const correct = verdict.correct;
  // 분수 값은 맞는데 약분을 안 한 경우는 따로 짚어준다
  const reason = correct ? null
    : verdict.note === 'notReduced' ? '계산은 맞았어요. 약분만 하면 돼요'
    : gen.diagnose(q.factKey, typeof given === 'object' ? given : Number(given), q.ctx);
  const shown = answer.formatGiven(given, q.answer);

  const m = store.mastery(skillId, q.factKey);
  const outcome = srs.applyResult(m, { correct, ms, given: shown, reason }, target, d.bestMs);

  sess.items.push({ skillId, factKey: q.factKey, given: shown, correct, ms,
                    variant: q.variant, at: Date.now() });

  // 콤보. 3·5·10 에서 반응을 키운다.
  sess.streak = correct ? sess.streak + 1 : 0;
  sess.bestStreak = Math.max(sess.bestStreak, sess.streak);
  const milestone = correct && [3, 5, 10, 15, 20].includes(sess.streak) ? sess.streak : 0;

  // 난이도 레벨은 최근 성적을 보고 스스로 오르내린다
  const lv = difficulty.record(skillId, { correct, fast: srs.isFast(ms, target) });

  // 틀린 문제는 하트를 깎는 대신 이 판이 끝날 때 한 번 더 낸다.
  const inRetry = sess.index >= sess.queue.length;
  const already = sess.retryQueue.some((r) => {
    const e = entryOf(sess, r);
    return e.skillId === skillId && e.factKey === q.factKey;
  });
  if (!correct && !inRetry && !already) {
    sess.retryQueue.push({ skillId, factKey: q.factKey });
  }

  sess.index += 1;
  sess.question = nextQuestion(sess);
  sess.questionStartedAt = Date.now();
  const done = !sess.question;
  store.save();

  return { correct, answer: q.answer, answerText: answer.format(q.answer),
           reason, note: verdict.note, ms, ...outcome, done, skillId,
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

  // 마스터·빠름 판정도 문항마다 그 스킬의 기준으로 잰다
  const skillOf = (i) => i.skillId || sess.skillId;
  const tag = (i) => `${skillOf(i)}:${i.factKey}`;

  const masteredNow = [];
  const seenTags = new Set();
  for (const i of sess.items) {
    if (seenTags.has(tag(i))) continue;
    seenTags.add(tag(i));
    const m = store.mastery(skillOf(i), i.factKey);
    if (srs.isMastered(m, skillTargetMs(skillOf(i)))) {
      masteredNow.push({ skillId: skillOf(i), factKey: i.factKey });
    }
  }

  const faster = sess.items
    .filter((i) => i.correct && i.ms <= skillTargetMs(skillOf(i)))
    .map((i) => ({ skillId: skillOf(i), factKey: i.factKey }));

  const uniq = (list) => {
    const seen = new Set(); const out = [];
    for (const e of list) { const t = `${e.skillId}:${e.factKey}`;
      if (!seen.has(t)) { seen.add(t); out.push(e); } }
    return out;
  };

  const summary = {
    kind: sess.kind || 'skill',
    opId: sess.opId || null,
    skillId: sess.skillId,
    // 이 판에 실제로 나온 스킬들 (섞은 판은 여럿)
    skills: [...new Set(sess.items.map(skillOf))],
    total: main.length,
    correct: correctCount,
    retried: sess.retryQueue.length,
    avgMs: main.length ? Math.round(main.reduce((a, i) => a + i.ms, 0) / main.length) : 0,
    fast: uniq(faster),
    mastered: uniq(masteredNow),
    wrong: uniq(main.filter((i) => !i.correct)
                    .map((i) => ({ skillId: skillOf(i), factKey: i.factKey }))),
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

  // 새로 마스터한 단이 있으면 스티커를 준다 (섞은 판은 나온 스킬 전부 확인)
  for (const skillId of summary.skills) awardStickers(d, skillId, summary);
  store.save();

  // 용돈 적립은 세션이 확정된 뒤에. 주간 목표는 이번 판을 포함해 계산한다.
  const goalDays = store.settings().weeklyGoalDays;
  const weeklyGoalMet = weekStamps().filter(Boolean).length >= goalDays;
  summary.earned = allowance.awardForSession(summary, { weeklyGoalMet });
  summary.balance = allowance.balance();

  // ⭐ 별은 저금통과 완전히 별개로 계산한다 (하나는 실제 돈, 하나는 꾸미기 전용).
  summary.stars = points.awardForSession(summary, { weeklyGoalMet });
  summary.starBalance = points.balance();

  // 오늘의 미션과, 이번 판으로 새로 열린 꾸미기 아이템
  summary.quests = quests.recordSession(summary);
  summary.unlocked = cosmetics.claimUnlocked();
  return summary;
}

function awardStickers(d, skillId, summary) {
  const gen = SKILLS[skillId];
  const s = store.settings();
  for (const g of gen.groups()) {
    const target = skillTargetMs(skillId);
    const all = g.facts.every((k) => {
      const m = d.mastery[`${skillId}:${k}`];
      return m && srs.isMastered(m, target);
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
  const correct = answer.check(given, q.answer).correct;
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
  const stars = isBest ? points.awardForRally() : null;
  const quest = quests.recordRally(score);
  const unlocked = cosmetics.claimUnlocked();
  return { best: d.rally[skillId].best, prev, isBest, earned, stars, quest, unlocked };
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
