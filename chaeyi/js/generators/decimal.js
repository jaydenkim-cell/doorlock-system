/**
 * 소수 사칙 (초4~6)
 *
 * 이 단원에서 아이들이 틀리는 이유는 계산력이 아니라 거의 전부 **소수점 위치**다.
 * 그래서 factKey 를 구체적 수가 아니라 **연산 + 소수점 아래 자릿수 조합**으로 잡는다.
 * `add:1,2` = 소수 첫째 자리 + 소수 둘째 자리. 수는 매번 달라져도
 * "자릿수가 다른 소수를 더하는 일"이라는 숙련도는 하나로 추적된다.
 */

import { randInt, pick, tok, expr, orderByGroups } from './_util.js';

export const id = 'decimal';
export const title = '소수';
export const emoji = '·';
export const mapTitle = '소수 지도';
export const targetMs = 15000;

/**
 * 이 문항이 네 연산(＋ − × ÷) 중 무엇인가. 홈의 연산 분류와 섞어내기 세션이
 * 이 값으로 문항을 모은다. 네 연산으로 안 갈리는 단원은 null 을 돌려준다.
 */
export function opOf(key) {
  const p = String(key).split(':')[0];
  return ['add', 'sub', 'mul', 'div'].includes(p) ? p : null;
}

export const VARIANTS = [
  { id: 'basic',     minLevel: 1, weight: 6 },
  { id: 'truefalse', minLevel: 2, weight: 3 },   // 소수점 위치가 맞나?
  { id: 'missing',   minLevel: 4, weight: 2 },
];

const OPS = { add: '+', sub: '−', mul: '×', div: '÷' };

export function parseFact(key) {
  const [op, ps] = key.split(':');
  const [p1, p2] = ps.split(',').map(Number);
  return { op, p1, p2 };          // p = 소수점 아래 자릿수 (0 이면 자연수)
}

export function factKeyOf(op, p1, p2) { return `${op}:${p1},${p2}`; }

export function allFacts() {
  const out = [];
  for (const op of ['add', 'sub']) {
    for (const [p1, p2] of [[1, 1], [2, 2], [1, 2], [2, 1], [1, 0], [2, 0]]) {
      out.push(factKeyOf(op, p1, p2));
    }
  }
  for (const [p1, p2] of [[1, 0], [2, 0], [1, 1], [2, 1]]) out.push(factKeyOf('mul', p1, p2));
  for (const [p1, p2] of [[1, 0], [2, 0]]) out.push(factKeyOf('div', p1, p2));
  return out;
}

export function groups() {
  const all = allFacts();
  return [
    { id: 'addsub', label: '덧셈·뺄셈', facts: all.filter((k) => /^(add|sub)/.test(k)) },
    { id: 'mul', label: '소수 곱셈', facts: all.filter((k) => k.startsWith('mul')) },
    { id: 'div', label: '소수 나눗셈', facts: all.filter((k) => k.startsWith('div')) },
  ];
}

export function newFactOrder() { return orderByGroups(groups()); }

export function placementFacts() {
  return ['add:1,1', 'sub:1,1', 'add:1,2', 'sub:2,1', 'add:2,2', 'sub:1,0',
          'mul:1,0', 'mul:1,1', 'mul:2,0', 'div:1,0', 'div:2,0', 'add:2,0'];
}

export function canUse(variant, key) {
  if (variant === 'missing') return /^(add|sub)/.test(key);
  return true;
}

export function answerOf(key) { const { p1 } = parseFact(key); return p1; }

/** 소수점 아래 p자리 수 하나를 만든다 */
function num(p) {
  if (p === 0) return randInt(2, 9);
  const whole = randInt(1, 9);
  const frac = randInt(1, Math.pow(10, p) - 1);
  return Number((whole + frac / Math.pow(10, p)).toFixed(p));
}

function round(v, p) { return Number(v.toFixed(p)); }

/** 이 문제의 답이 소수점 아래 몇 자리까지 나오는가 */
function resultPlaces(op, p1, p2) {
  if (op === 'mul') return p1 + p2;
  if (op === 'div') return Math.max(p1, 1);
  return Math.max(p1, p2);
}

function build(key) {
  const { op, p1, p2 } = parseFact(key);
  let x = num(p1), y = num(p2);
  let places = resultPlaces(op, p1, p2);
  let value;

  if (op === 'add') value = round(x + y, places);
  else if (op === 'sub') { if (x < y) [x, y] = [y, x]; value = round(x - y, places); }
  else if (op === 'mul') value = round(x * y, places);
  else {
    // 나눗셈은 딱 떨어지게 만든다 — 무한소수를 초등에게 낼 수는 없다
    y = randInt(2, 9);
    const q = num(p1);
    x = round(q * y, p1);
    value = q;
    places = p1;
  }
  return { x, y, value, places };
}

export function diagnose(key, given, ctx) {
  const { op } = parseFact(key);
  const variant = ctx?.variant || 'basic';
  const sign = OPS[op];

  if (variant === 'truefalse') {
    return ctx.shown === ctx.value
      ? `${ctx.x} ${sign} ${ctx.y} = ${ctx.value} 가 맞아요`
      : `${ctx.x} ${sign} ${ctx.y} 는 ${ctx.shown}이 아니라 ${ctx.value} 예요`;
  }
  if (variant === 'missing') {
    if (Math.abs(Number(given) - ctx.y) < 1e-9) return null;
    return `빈칸에 ${ctx.y} 가 들어가야 ${ctx.value} 가 돼요`;
  }

  const v = Number(given);
  if (!Number.isFinite(v)) return '숫자를 입력해 주세요';
  if (Math.abs(v - ctx.value) < 1e-9) return null;

  // 이 단원 최다 실수: 소수점 위치. 10배·100배 어긋났는지 먼저 본다.
  for (const f of [10, 100, 0.1, 0.01]) {
    if (Math.abs(v - ctx.value * f) < 1e-9) return '소수점 위치가 어긋났어요';
  }
  // 자릿수를 안 맞추고 끝자리끼리 계산한 경우
  const naive = op === 'add' ? Number(String(ctx.x).replace('.', '')) + Number(String(ctx.y).replace('.', '')) : null;
  if (naive !== null && Math.abs(v - naive) < 1e-9) return '소수점을 빼고 계산했어요. 자리를 맞춰서 더해요';
  if (Math.abs(v - ctx.value) < 0.11) return '거의 맞았어요. 자릿수를 다시 확인해 보세요';
  return `${ctx.x} ${sign} ${ctx.y} = ${ctx.value} 예요`;
}

// ── 형태별 ───────────────────────────────────────────────────────────

function qBasic(key) {
  const { op } = parseFact(key);
  const b = build(key);
  return {
    answer: { type: 'dec', value: b.value, places: b.places, maxLen: 7 },
    mode: 'input',
    ctxExtra: b,
    render: expr(tok(b.x), tok(OPS[op]), tok(b.y), tok('='), tok('?', true)),
    hint: '소수점 위치를 맞춰요',
  };
}

function qTrueFalse(key) {
  const { op } = parseFact(key);
  const b = build(key);
  const truthy = Math.random() < 0.5;
  // 틀린 보기는 소수점을 한 칸 밀어 만든다 — 실제로 가장 흔한 오류다
  const shown = truthy ? b.value : round(b.value * pick([10, 0.1]), b.places + 1);
  return {
    answer: { type: 'ox', value: truthy ? 1 : 0 },
    mode: 'ox',
    ctxExtra: { ...b, shown },
    render: { ...expr(tok(b.x), tok(OPS[op]), tok(b.y), tok('='), tok(shown)), ox: true },
    hint: '맞으면 O, 틀리면 X',
  };
}

function qMissing(key) {
  const { op, p2 } = parseFact(key);
  const b = build(key);
  return {
    answer: { type: 'dec', value: b.y, places: p2, maxLen: 7 },
    mode: 'input',
    ctxExtra: b,
    render: expr(tok(b.x), tok(OPS[op]), tok('?', true), tok('='), tok(b.value)),
    hint: '빈칸의 수를 찾아요',
  };
}

const BUILDERS = { basic: qBasic, truefalse: qTrueFalse, missing: qMissing };

export function makeQuestion(key, box = 0, variant = 'basic') {
  const use = BUILDERS[variant] && canUse(variant, key) ? variant : 'basic';
  const built = BUILDERS[use](key);
  const { op } = parseFact(key);
  return {
    skillId: id,
    factKey: key,
    variant: use,
    prompt: `${built.ctxExtra.x} ${OPS[op]} ${built.ctxExtra.y}`,
    answer: built.answer,
    mode: built.mode,
    render: built.render,
    hint: built.hint,
    ctx: { variant: use, ...built.ctxExtra },
  };
}
