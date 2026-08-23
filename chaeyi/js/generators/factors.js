/**
 * 약수와 배수 · 약분 (초5)
 *
 * 분수 계산이 무너지는 진짜 원인은 대개 여기다. 통분을 못 하는 게 아니라
 * 최소공배수를 못 찾는 것이고, 약분을 안 하는 게 아니라 최대공약수를 못 보는 것이다.
 * 그래서 분수와 별개 스킬로 떼어 두고 따로 추적한다.
 *
 * factKey 는 수 쌍 그대로 잡는다 — `gcd:12,18`. 조합이 유한하고
 * "12와 18" 이라는 구체적 쌍마다 익숙함이 다르기 때문이다.
 */

import { shuffle, gcd, reduce, tok, expr, fracTok, pickDistractors, orderByGroups } from './_util.js';

export const id = 'factors';
export const title = '약수와 배수';
export const emoji = '🔢';
export const mapTitle = '약수·배수 지도';
export const targetMs = 20000;

export const VARIANTS = [
  { id: 'basic',     minLevel: 1, weight: 6 },
  { id: 'truefalse', minLevel: 2, weight: 3 },
  { id: 'listing',   minLevel: 3, weight: 2 },   // 약수의 개수
];

const PAIRS = [
  [4, 6], [6, 8], [6, 9], [8, 12], [9, 12], [10, 15], [12, 18], [12, 16],
  [15, 20], [16, 24], [18, 24], [20, 30], [14, 21], [24, 36],
];

export function parseFact(key) {
  const [kind, nums] = key.split(':');
  const [a, b] = nums.split(',').map(Number);
  return { kind, a, b };
}

export function factKeyOf(kind, a, b) { return `${kind}:${a},${b}`; }

export function lcm(a, b) { return (a * b) / gcd(a, b); }

export function answerOf(key) {
  const { kind, a, b } = parseFact(key);
  if (kind === 'gcd') return gcd(a, b);
  if (kind === 'lcm') return lcm(a, b);
  return reduce(a, b).num;                 // reduce
}

export function allFacts() {
  const out = [];
  for (const [a, b] of PAIRS) {
    out.push(factKeyOf('gcd', a, b), factKeyOf('lcm', a, b));
    if (gcd(a, b) > 1) out.push(factKeyOf('reduce', a, b));   // 약분할 게 있어야 문제가 된다
  }
  return out;
}

export function groups() {
  const all = allFacts();
  return [
    { id: 'gcd', label: '최대공약수', facts: all.filter((k) => k.startsWith('gcd')) },
    { id: 'lcm', label: '최소공배수', facts: all.filter((k) => k.startsWith('lcm')) },
    { id: 'reduce', label: '약분', facts: all.filter((k) => k.startsWith('reduce')) },
  ];
}

export function newFactOrder() { return orderByGroups(groups()); }

export function placementFacts() {
  return ['gcd:4,6', 'gcd:12,18', 'lcm:4,6', 'lcm:6,9', 'reduce:6,8', 'reduce:12,18',
          'gcd:8,12', 'lcm:8,12', 'reduce:9,12', 'gcd:15,20', 'lcm:10,15', 'reduce:16,24'];
}

export function canUse(variant, key) {
  if (variant === 'listing') return key.startsWith('gcd');
  return true;
}

function divisorCount(n) {
  let c = 0;
  for (let i = 1; i <= n; i++) if (n % i === 0) c++;
  return c;
}

export function diagnose(key, given, ctx) {
  const { kind, a, b } = parseFact(key);
  const variant = ctx?.variant || 'basic';

  if (variant === 'truefalse') {
    return ctx.shown === ctx.value
      ? `맞아요. ${ctx.label}는 ${ctx.value} 예요`
      : `${ctx.label}는 ${ctx.shown}이 아니라 ${ctx.value} 예요`;
  }
  if (variant === 'listing') {
    if (Number(given) === ctx.value) return null;
    return `${a}의 약수는 ${ctx.list.join(', ')} — 모두 ${ctx.value}개예요`;
  }

  if (kind === 'reduce') {
    const g = given || {};
    const gn = Number(g.num), gd = Number(g.den);
    const r = reduce(a, b);
    if (!Number.isFinite(gn) || !Number.isFinite(gd) || gd === 0) return '분수를 채워 주세요';
    if (gn * r.den === r.num * gd && !(gn === r.num && gd === r.den)) {
      return `조금 더 약분할 수 있어요. ${a}와 ${b}의 최대공약수는 ${gcd(a, b)} 예요`;
    }
    return `${a}/${b} 를 ${gcd(a, b)}로 나누면 ${r.num}/${r.den} 이에요`;
  }

  const v = Number(given);
  const G = gcd(a, b), L = lcm(a, b);
  if (kind === 'gcd') {
    if (v === L) return '최소공배수를 답했어요. 최대공약수는 두 수를 나누는 수예요';
    if (v === a || v === b) return `${v} 로는 ${v === a ? b : a} 를 나눌 수 없어요`;
    if (a % v === 0 && b % v === 0) return `${v} 도 공약수지만 가장 큰 것은 ${G} 예요`;
    return `${a}와 ${b}를 모두 나누는 가장 큰 수는 ${G} 예요`;
  }
  // lcm
  if (v === G) return '최대공약수를 답했어요. 최소공배수는 두 수의 배수예요';
  if (v === a * b) return `${a}×${b} 는 공배수지만 가장 작은 것은 ${L} 예요`;
  if (v % a === 0 && v % b === 0) return `${v} 도 공배수지만 가장 작은 것은 ${L} 예요`;
  return `${a}와 ${b}의 배수 중 가장 작은 공통 수는 ${L} 예요`;
}

// ── 형태별 ───────────────────────────────────────────────────────────

const LABEL = { gcd: '최대공약수', lcm: '최소공배수', reduce: '약분' };

function qBasic(key, box) {
  const { kind, a, b } = parseFact(key);

  if (kind === 'reduce') {
    const r = reduce(a, b);
    return {
      answer: { type: 'frac', num: r.num, den: r.den, requireReduced: true },
      mode: 'input',
      ctxExtra: { value: r, label: '약분' },
      render: { type: 'expr', tokens: [fracTok(a, b), tok('='), fracTok('?', '?', true)] },
      hint: '더 이상 나눌 수 없을 때까지 줄여요',
    };
  }

  const value = kind === 'gcd' ? gcd(a, b) : lcm(a, b);
  const other = kind === 'gcd' ? lcm(a, b) : gcd(a, b);
  const mode = box <= 0 ? 'choice' : 'input';
  return {
    answer: { type: 'int', value, maxLen: 4 },
    mode,
    choices: mode === 'choice'
      ? shuffle([value, ...pickDistractors([other, a, b, a * b, value * 2], value, 3)])
      : undefined,
    ctxExtra: { value, label: LABEL[kind] },
    render: expr(tok(`${a}, ${b}`), tok('의'), tok(LABEL[kind]), tok('=', ), tok('?', true)),
    hint: kind === 'gcd' ? '두 수를 모두 나누는 가장 큰 수' : '두 수의 배수 중 가장 작은 수',
  };
}

function qTrueFalse(key) {
  const { kind, a, b } = parseFact(key);
  const real = kind === 'gcd' ? gcd(a, b) : kind === 'lcm' ? lcm(a, b) : reduce(a, b).num;
  const label = LABEL[kind];
  const truthy = Math.random() < 0.5;
  const shown = truthy ? real : (kind === 'lcm' ? a * b : Math.max(1, real - 1));
  return {
    answer: { type: 'ox', value: truthy ? 1 : 0 },
    mode: 'ox',
    ctxExtra: { value: real, shown, label },
    render: { type: 'expr', ox: true,
      tokens: [tok(`${a}, ${b}`), tok('의'), tok(label), tok('='), tok(shown)] },
    hint: '맞으면 O, 틀리면 X',
  };
}

function qListing(key) {
  const { a } = parseFact(key);
  const list = [];
  for (let i = 1; i <= a; i++) if (a % i === 0) list.push(i);
  return {
    answer: { type: 'int', value: list.length, maxLen: 2 },
    mode: 'input',
    ctxExtra: { value: list.length, list, label: '약수의 개수' },
    render: expr(tok(a), tok('의'), tok('약수는'), tok('모두'), tok('?', true), tok('개')),
    hint: '1과 자기 자신도 약수예요',
  };
}

const BUILDERS = { basic: qBasic, truefalse: qTrueFalse, listing: qListing };

export function makeQuestion(key, box = 0, variant = 'basic') {
  const use = BUILDERS[variant] && canUse(variant, key) ? variant : 'basic';
  const built = BUILDERS[use](key, box);
  const { kind, a, b } = parseFact(key);
  return {
    skillId: id,
    factKey: key,
    variant: use,
    prompt: kind === 'reduce' ? `${a}/${b} 약분` : `${a}, ${b} ${LABEL[kind]}`,
    answer: built.answer,
    mode: built.mode,
    choices: built.choices,
    render: built.render,
    hint: built.hint,
    ctx: { variant: use, ...built.ctxExtra },
  };
}
