/**
 * 곱셈구구 (2단~9단) 문항 생성기
 *
 * 콘텐츠 고갈이 이런 앱을 죽인다. 그래서 문제를 파일에 적어두지 않고
 * 규칙으로 만들어 낸다.
 *
 * 그런데 1차에는 형태가 `7 × 8 = ?` 하나뿐이라 72문항이 전부 같은 틀이었다.
 * 이제 같은 사실 하나를 여섯 가지 방식으로 묻는다. 중요한 것은
 * **형태가 바뀌어도 factKey 는 그대로**라는 점이다. `7 × ? = 56` 도
 * `7x8` 의 숙련도로 추적된다. 안 그러면 간격 반복이 통째로 깨진다.
 *
 * 오답 선지는 무작위로 뽑지 않는다. 실제로 아이들이 헷갈리는 패턴으로 만들어야
 * "무엇을 틀렸는가"가 곧 진단 데이터가 된다.
 */

import { wa } from '../ko.js';
export { wa };

export const id = 'mul';
export const title = '곱셈구구';
export const emoji = '✖️';

const MIN_TABLE = 2;
const MAX_TABLE = 9;

/**
 * 문제 형태. minLevel 은 난이도 레벨이 얼마일 때 열리는지,
 * weight 는 뽑힐 상대 빈도.
 * basic 가중치를 가장 높게 둔다 — 익숙한 틀이 기준선으로 남아야 한다.
 */
export const VARIANTS = [
  { id: 'basic',     minLevel: 1, weight: 6 },  // 7 × 8 = ?
  { id: 'groups',    minLevel: 1, weight: 2 },  // 🍎🍎🍎 이 4묶음
  { id: 'skip',      minLevel: 2, weight: 3 },  // 7, 14, 21, ?, 35
  { id: 'missingB',  minLevel: 3, weight: 3 },  // 7 × ? = 56
  { id: 'truefalse', minLevel: 3, weight: 2 },  // 7 × 8 = 54 맞을까?
  { id: 'missingA',  minLevel: 4, weight: 2 },  // ? × 8 = 56
];

const GROUP_EMOJI = ['🍎', '🍓', '🐢', '⭐️', '🍪', '🐥', '🌸', '🚗'];

export function parseFact(key) {
  const [a, b] = key.split('x').map(Number);
  return { a, b };
}

export function factKeyOf(a, b) { return `${a}x${b}`; }

export function answerOf(key) {
  const { a, b } = parseFact(key);
  return a * b;
}

/** 2단~9단 × 1~9 = 72문항 */
export function allFacts() {
  const out = [];
  for (let a = MIN_TABLE; a <= MAX_TABLE; a++) {
    for (let b = 1; b <= 9; b++) out.push(factKeyOf(a, b));
  }
  return out;
}

/**
 * 처음 배울 때의 순서. allFacts() 순서(2,3,4…)를 그대로 쓰면
 * 어려운 단이 뒤로 몰리고, 무엇보다 아이가 매 판 같은 단만 행진하게 된다.
 * 쉬운 단부터 올라가되 각 단 안에서는 섞는다.
 */
const LEARNING_ORDER = [2, 5, 3, 4, 6, 7, 8, 9];

export function newFactOrder() {
  const out = [];
  for (const a of LEARNING_ORDER) {
    const row = Array.from({ length: 9 }, (_, i) => factKeyOf(a, i + 1));
    out.push(...shuffle(row));
  }
  return out;
}

/** 단(段) 단위로 묶어서 홈 화면 "구구단 지도"에 쓴다 */
export function groups() {
  const out = [];
  for (let a = MIN_TABLE; a <= MAX_TABLE; a++) {
    out.push({
      id: `${a}dan`,
      label: `${a}단`,
      facts: Array.from({ length: 9 }, (_, i) => factKeyOf(a, i + 1)),
    });
  }
  return out;
}

/** 진단 판에서 각 단을 대표할 문항. 너무 쉽지도 어렵지도 않은 중간값 */
export function placementFacts() {
  const out = [];
  for (const a of LEARNING_ORDER) out.push(factKeyOf(a, a <= 3 ? 7 : 6));
  for (const a of [7, 8, 9, 6]) out.push(factKeyOf(a, 8));
  return out;
}

function digitSwap(n) {
  const s = String(n);
  if (s.length !== 2 || s[0] === s[1]) return null;
  const swapped = Number(s[1] + s[0]);
  return swapped === n ? null : swapped;
}

/**
 * 실제 혼동 패턴에서 오답 선지를 만든다.
 *  - 인접한 곱   : 7×8 을 7×7 / 7×9 로 센 경우 (구구단을 외다가 한 칸 밀림)
 *  - 반대쪽 인접 : 6×8 / 8×8
 *  - 자릿수 뒤집기: 56 → 65
 *  - 덧셈 오적용  : 7+8 = 15
 */
export function distractors(key, count = 3) {
  const { a, b } = parseFact(key);
  const correct = a * b;
  const pool = [];
  const push = (v) => {
    if (Number.isInteger(v) && v > 0 && v !== correct && !pool.includes(v)) pool.push(v);
  };

  push(a * (b - 1));
  push(a * (b + 1));
  push((a - 1) * b);
  push((a + 1) * b);
  push(digitSwap(correct));
  push(a + b);
  push(correct + a);
  push(correct - b);

  // 그래도 모자라면 근처 값으로 채운다
  for (let d = 1; pool.length < count && d < 12; d++) { push(correct + d); push(correct - d); }

  // 정답에 가까운 것 위주로 섞어서 고르기 (너무 동떨어진 선지는 힌트가 된다)
  const sorted = pool.sort((x, y) => Math.abs(x - correct) - Math.abs(y - correct));
  const near = sorted.slice(0, Math.min(sorted.length, count + 3));
  return shuffle(near).slice(0, count);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * 이 형태를 이 문항에 쓸 수 있는가.
 *  - groups : 이모지를 실제로 늘어놓으므로 곱이 크면 화면이 무너진다
 *  - skip   : 빈칸 앞에 최소 두 항이 있어야 규칙이 보인다
 */
export function canUse(variant, key) {
  const { a, b } = parseFact(key);
  if (variant === 'groups') return a * b <= 20;
  if (variant === 'skip') return b >= 3;
  return true;
}

/**
 * 아이가 적은 오답이 어떤 종류의 실수인지 이름을 붙인다.
 * 부모 리포트에서 "7×8을 세 번 틀림"이 아니라
 * "7×8을 7×7과 헷갈림"으로 보여주기 위한 것.
 */
export function diagnose(key, given, ctx) {
  const { a, b } = parseFact(key);
  const correct = a * b;
  const variant = ctx?.variant || 'basic';

  // 곱이 아니라 곱해지는 수를 묻는 형태는 다른 방식으로 설명한다
  if (variant === 'missingB') {
    if (given === b) return null;
    return `${a} × ${given} 은 ${a * given} 이라서 ${correct}이 안 돼요`;
  }
  if (variant === 'missingA') {
    if (given === a) return null;
    return `${given} × ${b} 는 ${given * b} 이라서 ${correct}이 안 돼요`;
  }
  if (variant === 'truefalse') {
    const shown = ctx?.shown;
    if (shown === correct) return `${a} × ${b} 는 ${correct}이 맞아요`;
    return `${a} × ${b} 는 ${shown}이 아니라 ${correct}이에요`;
  }
  if (variant === 'skip' && given !== correct) {
    return `${a}씩 뛰어세면 ${a * (b - 1)} 다음은 ${correct}이에요`;
  }

  if (given === correct) return null;
  if (given === a + b) return '곱셈 자리에 덧셈을 함';
  if (given === a * (b - 1)) return `${a}×${b - 1}${wa(b - 1)} 헷갈림 (한 칸 앞)`;
  if (given === a * (b + 1)) return `${a}×${b + 1}${wa(b + 1)} 헷갈림 (한 칸 뒤)`;
  if (given === (a - 1) * b) return `${a - 1}×${b}${wa(b)} 헷갈림`;
  if (given === (a + 1) * b) return `${a + 1}×${b}${wa(b)} 헷갈림`;
  if (digitSwap(correct) === given) return '숫자 순서를 뒤집어 씀';

  // 다른 구구단의 답인가?
  for (let p = MIN_TABLE; p <= MAX_TABLE; p++) {
    for (let q = 1; q <= 9; q++) {
      if (p * q !== given) continue;
      if (p === a || q === a || p === b || q === b) return `${p}×${q}${wa(q)} 헷갈림`;
    }
  }
  if (Math.abs(given - correct) <= 2) return '거의 맞음 (조금 어긋남)';
  return '아직 외우지 못함';
}

// ── 형태별 문항 만들기 ────────────────────────────────────────────────

function qBasic(key, box) {
  const { a, b } = parseFact(key);
  const answer = a * b;
  // 처음 만나는 문제만 보기에서 고르게 한다. 그 뒤로는 직접 입력 — 찍기를 막기 위해.
  const mode = box <= 0 ? 'choice' : 'input';
  return {
    answer, mode,
    choices: mode === 'choice' ? shuffle([answer, ...distractors(key, 3)]) : undefined,
    render: { type: 'expr', tokens: [
      { t: String(a) }, { t: '×' }, { t: String(b) }, { t: '=' }, { t: '?', blank: true },
    ] },
    hint: `${a}개씩 ${b}묶음`,
  };
}

function qGroups(key) {
  const { a, b } = parseFact(key);
  const answer = a * b;
  return {
    answer, mode: 'choice',
    choices: shuffle([answer, ...distractors(key, 3)]),
    render: { type: 'groups', emoji: pick(GROUP_EMOJI), per: a, times: b },
    hint: `${a}개씩 ${b}묶음이면 모두 몇 개?`,
  };
}

function qSkip(key) {
  const { a, b } = parseFact(key);
  const start = Math.max(1, b - 2);
  const end = Math.min(9, b + 1);
  const nums = [];
  for (let i = start; i <= end; i++) nums.push(i === b ? null : a * i);
  return {
    answer: a * b, mode: 'input',
    render: { type: 'sequence', nums },
    hint: `${a}씩 뛰어세기`,
  };
}

function qMissingB(key) {
  const { a, b } = parseFact(key);
  return {
    answer: b, mode: 'input',
    render: { type: 'expr', tokens: [
      { t: String(a) }, { t: '×' }, { t: '?', blank: true }, { t: '=' }, { t: String(a * b) },
    ] },
    hint: `${a}에 몇을 곱해야 ${a * b}이 될까요?`,
  };
}

function qMissingA(key) {
  const { a, b } = parseFact(key);
  return {
    answer: a, mode: 'input',
    render: { type: 'expr', tokens: [
      { t: '?', blank: true }, { t: '×' }, { t: String(b) }, { t: '=' }, { t: String(a * b) },
    ] },
    hint: `몇에 ${b}를 곱해야 ${a * b}이 될까요?`,
  };
}

function qTrueFalse(key) {
  const { a, b } = parseFact(key);
  const correct = a * b;
  const truthy = Math.random() < 0.5;
  const shown = truthy ? correct : distractors(key, 1)[0];
  return {
    answer: truthy ? 1 : 0, mode: 'ox', ctxExtra: { shown },
    render: { type: 'expr', ox: true, tokens: [
      { t: String(a) }, { t: '×' }, { t: String(b) }, { t: '=' }, { t: String(shown) },
    ] },
    hint: '맞으면 O, 틀리면 X',
  };
}

const BUILDERS = {
  basic: qBasic, groups: qGroups, skip: qSkip,
  missingB: qMissingB, missingA: qMissingA, truefalse: qTrueFalse,
};

/**
 * 세션에 넣을 문항 하나를 만든다.
 * @param {string} key   factKey. 형태가 무엇이든 이 값은 유지된다
 * @param {number} box   Leitner 박스. 0이면 처음 만나는 문제
 * @param {string} variant  난이도 엔진이 고른 형태 (기본 basic)
 */
export function makeQuestion(key, box = 0, variant = 'basic') {
  const use = BUILDERS[variant] && canUse(variant, key) ? variant : 'basic';
  const built = BUILDERS[use](key, box);
  const { a, b } = parseFact(key);
  return {
    skillId: id,
    factKey: key,
    variant: use,
    prompt: `${a} × ${b}`,   // 결과 화면·리포트에서 사람이 읽는 이름
    answer: built.answer,
    mode: built.mode,
    choices: built.choices,
    render: built.render,
    hint: built.hint,
    ctx: { variant: use, ...(built.ctxExtra || {}) },
  };
}
