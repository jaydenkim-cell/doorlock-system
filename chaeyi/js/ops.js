/**
 * 연산 분류 — ＋ − × ÷
 *
 * 5차까지 홈의 단위는 **스킬**이었다 (곱셈구구 / 받아올림·받아내림 / 분수 …).
 * 그런데 아이가 머릿속에 갖고 있는 분류는 스킬이 아니라 **연산 네 가지**다.
 * "오늘의 공부 시작"이 곱셈구구 한 스킬만 열어 주니 아이 눈에는 매번 곱셈만
 * 나오는 앱이었다 — 실제로 그랬다.
 *
 * 여기서 하는 일은 두 가지다.
 *  1) 학년에 열려 있는 스킬들의 문항을 연산별로 다시 묶는다.
 *     한 스킬이 여러 연산에 걸치는 경우가 많다 (받아올림·받아내림 = ＋ 와 −,
 *     분수·소수·정수는 네 연산 전부). 그래서 스킬이 아니라 **문항 단위**로
 *     생성기의 `opOf(factKey)` 에 물어 가른다.
 *  2) 부모가 연산을 켜고 끌 수 있게 한다. 기본값은 학년을 따른다.
 *
 * 학년에 아직 없는 연산도 화면에는 보여 준다 — 잠긴 상태로. 초2에게 나눗셈이
 * 없는 것은 버그가 아니라 교육과정이라, 감추는 것보다 이유를 적어 두는 편이 낫다.
 */

import * as store from './state.js';
import * as grades from './grades.js';

export const OPS = [
  { id: 'add', sign: '＋', label: '더하기', color: 'mint' },
  { id: 'sub', sign: '－', label: '빼기',   color: 'sky' },
  { id: 'mul', sign: '×',  label: '곱하기', color: 'sun' },
  { id: 'div', sign: '÷',  label: '나누기', color: 'grape' },
];

export const OP_IDS = OPS.map((o) => o.id);

export function opInfo(opId) { return OPS.find((o) => o.id === opId) || null; }

/** 학년이 아직 안 연 연산을 눌렀을 때 보여줄 안내. 거짓말하지 않는다. */
const WHEN = {
  add: '1학년에 배워요',
  sub: '1학년에 배워요',
  mul: '2학년 2학기에 배워요',
  div: '3학년에 배워요',
};

export function whenLearned(opId) { return WHEN[opId] || ''; }

/**
 * 이 연산의 문항이 어느 스킬 어디에서 나오는가.
 * @returns {Array<{skillId:string, gen:object, facts:string[], label:string}>}
 */
export function sources(opId, skillIds) {
  const out = [];
  for (const skillId of skillIds) {
    const gen = SKILLS_REF[skillId];
    if (!gen || typeof gen.opOf !== 'function') continue;
    const facts = gen.allFacts().filter((k) => gen.opOf(k) === opId);
    if (facts.length) out.push({ skillId, gen, facts, label: gen.title });
  }
  return out;
}

/**
 * 세션 엔진이 자기 생성기 표를 여기에 등록한다.
 * `ops.js` 가 `session.js` 를 import 하면 순환이 되고, 생성기 10개를 여기서
 * 또 import 하면 같은 표가 두 벌이 된다. 등록 한 줄이 가장 싸다.
 */
let SKILLS_REF = {};
export function register(skills) { SKILLS_REF = skills; }

/** 이 학년에서 실제로 문항이 나오는 연산 (= 잠기지 않은 연산) */
export function unlocked(grade) {
  const skills = grades.of(grade).skills.filter((id) => SKILLS_REF[id]);
  return OP_IDS.filter((op) => sources(op, skills).length > 0);
}

/**
 * 부모가 켜 둔 연산. 설정이 없으면(기본) 학년이 연 것 전부.
 * 학년에 없는 연산을 부모가 켜면 그 연산의 스킬도 함께 열린다 (`extraSkills`).
 */
export function enabled(grade) {
  const chosen = store.settings().ops;
  const open = unlocked(grade);
  if (!Array.isArray(chosen)) return open;
  const on = OP_IDS.filter((op) => chosen.includes(op));
  // 전부 꺼 두면 낼 문제가 없다. 그건 설정이 아니라 사고라서 학년 기본으로 되돌린다.
  return on.length ? on : open;
}

/**
 * 부모가 연산을 추가로 켰을 때, 그걸 내려면 함께 열어야 하는 스킬.
 * 초2에게 나눗셈을 켜 주면 `divide` 생성기가 필요하다.
 */
const EXTRA_SKILL = { add: 'addsub', sub: 'addsub', mul: 'mul', div: 'divide' };

export function extraSkills(grade) {
  const chosen = store.settings().ops;
  if (!Array.isArray(chosen)) return [];
  const open = unlocked(grade);
  const out = [];
  for (const op of chosen) {
    if (open.includes(op)) continue;
    const s = EXTRA_SKILL[op];
    if (s && SKILLS_REF[s] && !out.includes(s)) out.push(s);
  }
  return out;
}

export function setEnabled(list) {
  const s = store.settings();
  s.ops = Array.isArray(list) ? OP_IDS.filter((op) => list.includes(op)) : null;
  store.save();
}

/** 부모가 손대지 않은 상태(=학년을 따름)인가 */
export function isDefault() {
  return !Array.isArray(store.settings().ops);
}
