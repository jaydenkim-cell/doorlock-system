/**
 * 나눗셈 — 몫과 나머지 (초3~4)
 *
 * 곱셈구구의 바로 다음 단계다. factKey 를 나눗셈식 하나하나로 잡으면 경우의 수가
 * 폭발하므로, **곱셈구구와 같은 사실**을 키로 삼는다. 56 ÷ 7 은 `7x8` 을 거꾸로
 * 묻는 것이고, 그래야 곱셈구구에서 쌓은 숙련도와 짝이 맞는다.
 *
 * 나머지가 있는 나눗셈은 같은 키에 나머지만 얹어서 낸다 (58 ÷ 7 = 8 … 2).
 */

import { shuffle, randInt, tok, expr, pickDistractors, orderByGroups } from './_util.js';

export const id = 'divide';
export const title = '나눗셈';
export const emoji = '➗';
export const mapTitle = '나눗셈 지도';
export const targetMs = 12000;   // 곱셈구구(3초)보다 한참 여유를 준다

/**
 * 이 문항이 네 연산(＋ − × ÷) 중 무엇인가. 홈의 연산 분류와 섞어내기 세션이
 * 이 값으로 문항을 모은다. 네 연산으로 안 갈리는 단원은 null 을 돌려준다.
 */
export function opOf() { return 'div'; }

export const VARIANTS = [
  { id: 'basic',     minLevel: 1, weight: 6 },  // 56 ÷ 7 = ?
  { id: 'remainder', minLevel: 2, weight: 4 },  // 58 ÷ 7 = 8 … ?
  { id: 'missing',   minLevel: 3, weight: 3 },  // ? ÷ 7 = 8
  { id: 'truefalse', minLevel: 3, weight: 2 },
];

const DIVISORS = [2, 5, 3, 4, 6, 7, 8, 9];

export function parseFact(key) {
  const [a, b] = key.split('x').map(Number);
  return { a, b };            // a = 나누는 수, b = 몫
}

export function factKeyOf(a, b) { return `${a}x${b}`; }
export function answerOf(key) { const { b } = parseFact(key); return b; }

/** 나누는 수 2~9 × 몫 2~9 = 64문항 (÷1 은 의미가 없어 뺀다) */
export function allFacts() {
  const out = [];
  for (const a of [2, 3, 4, 5, 6, 7, 8, 9]) {
    for (let b = 2; b <= 9; b++) out.push(factKeyOf(a, b));
  }
  return out;
}

export function groups() {
  return DIVISORS.map((a) => ({
    id: `${a}div`,
    label: `÷${a}`,
    facts: Array.from({ length: 8 }, (_, i) => factKeyOf(a, i + 2)),
  }));
}

export function newFactOrder() { return orderByGroups(groups()); }

export function placementFacts() {
  return DIVISORS.map((a) => factKeyOf(a, 6)).concat(['7x8', '8x7', '9x6', '6x9']);
}

export function canUse(variant, key) {
  const { a } = parseFact(key);
  if (variant === 'remainder') return a >= 3;   // 나머지가 1가지뿐이면 시시하다
  return true;
}

export function diagnose(key, given, ctx) {
  const { a, b } = parseFact(key);
  const variant = ctx?.variant || 'basic';

  if (variant === 'remainder') {
    if (given === ctx.rem) return null;
    return `${ctx.total} − ${a}×${ctx.q} = ${ctx.rem} 이에요`;
  }
  if (variant === 'missing') {
    if (given === a * b) return null;
    return `${given} ÷ ${a} 는 ${(given / a).toFixed(1)} 이라서 ${b}이 안 돼요`;
  }
  if (variant === 'truefalse') {
    const t = a * b;
    if (ctx.shown === b) return `${t} ÷ ${a} 는 ${b} 이 맞아요`;
    return `${t} ÷ ${a} 는 ${ctx.shown}이 아니라 ${b}이에요`;
  }

  if (given === b) return null;
  if (given === a * b) return '나누지 않고 그대로 적었어요';
  if (given === a) return '나누는 수를 답으로 적었어요';
  if (given === b + 1 || given === b - 1) return `한 칸 어긋났어요 (${a}단을 세어 보세요)`;
  if (a * given < a * b) return `${a} × ${given} = ${a * given} 이라 모자라요`;
  return `${a} × ${given} = ${a * given} 이라 너무 커요`;
}

// ── 형태별 ───────────────────────────────────────────────────────────

function qBasic(key, box) {
  const { a, b } = parseFact(key);
  const total = a * b;
  const mode = box <= 0 ? 'choice' : 'input';
  return {
    answer: { type: 'int', value: b },
    mode,
    choices: mode === 'choice'
      ? shuffle([b, ...pickDistractors([b + 1, b - 1, a, total, b + 2], b, 3)])
      : undefined,
    render: expr(tok(total), tok('÷'), tok(a), tok('='), tok('?', true)),
    hint: `${a}씩 몇 묶음일까요?`,
  };
}

function qRemainder(key) {
  const { a, b } = parseFact(key);
  const rem = randInt(1, a - 1);
  const total = a * b + rem;
  return {
    answer: { type: 'int', value: rem },
    mode: 'input',
    ctxExtra: { rem, total, q: b },
    render: expr(tok(total), tok('÷'), tok(a), tok('='), tok(b), tok('…'), tok('?', true)),
    hint: '남는 수는 몇일까요?',
  };
}

function qMissing(key) {
  const { a, b } = parseFact(key);
  return {
    answer: { type: 'int', value: a * b, maxLen: 3 },
    mode: 'input',
    render: expr(tok('?', true), tok('÷'), tok(a), tok('='), tok(b)),
    hint: `${a}로 나누어 ${b}이 되는 수`,
  };
}

function qTrueFalse(key) {
  const { a, b } = parseFact(key);
  const total = a * b;
  const truthy = Math.random() < 0.5;
  const shown = truthy ? b : (Math.random() < 0.5 ? b + 1 : Math.max(2, b - 1));
  return {
    answer: { type: 'ox', value: truthy && shown === b ? 1 : 0 },
    mode: 'ox',
    ctxExtra: { shown },
    render: { ...expr(tok(total), tok('÷'), tok(a), tok('='), tok(shown)), ox: true },
    hint: '맞으면 O, 틀리면 X',
  };
}

const BUILDERS = { basic: qBasic, remainder: qRemainder, missing: qMissing, truefalse: qTrueFalse };

export function makeQuestion(key, box = 0, variant = 'basic') {
  const use = BUILDERS[variant] && canUse(variant, key) ? variant : 'basic';
  const built = BUILDERS[use](key, box);
  const { a, b } = parseFact(key);
  return {
    skillId: id,
    factKey: key,
    variant: use,
    prompt: `${a * b} ÷ ${a}`,
    answer: built.answer,
    mode: built.mode,
    choices: built.choices,
    render: built.render,
    hint: built.hint,
    ctx: { variant: use, ...(built.ctxExtra || {}) },
  };
}
