/**
 * 분수 사칙 (초4~6)
 *
 * factKey 를 구체적 문제(3/4 + 1/6)로 잡으면 경우의 수가 폭발해서 간격 반복이
 * 작동하지 않는다. 그래서 **연산 + 분모 쌍**을 키로 삼는다 — `add:4,6`.
 * 분자는 매번 달라지지만 "4와 6을 통분하는 일"이라는 숙련도는 하나로 추적된다.
 * (받아올림에서 7+8 을 키로 삼은 것과 같은 방식)
 *
 * 답은 늘 기약분수를 요구한다. 값은 맞는데 약분을 안 했으면 틀렸다고만 하지 않고
 * **"계산은 맞았어요, 약분만 하면 돼요"** 로 알려준다 (answer.js 의 notReduced).
 */

import { shuffle, pick, randInt, gcd, reduce, tok, expr, fracTok, orderByGroups } from './_util.js';

export const id = 'fraction';
export const title = '분수';
export const emoji = '½';
export const mapTitle = '분수 지도';
export const targetMs = 20000;

export const VARIANTS = [
  { id: 'basic',    minLevel: 1, weight: 6 },  // 계산해서 기약분수로
  { id: 'compare',  minLevel: 2, weight: 3 },  // 어느 쪽이 큰가 (O/X)
  { id: 'missing',  minLevel: 4, weight: 2 },  // ? 를 채우기
];

/** 같은 분모끼리(쉬움) → 배수 관계(보통) → 서로소(어려움) 순 */
const DEN_PAIRS = {
  same:     [[2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [8, 8], [10, 10]],
  multiple: [[2, 4], [3, 6], [4, 8], [2, 6], [3, 9], [5, 10], [4, 12], [2, 8]],
  coprime:  [[2, 3], [3, 4], [4, 5], [3, 5], [5, 6], [2, 5], [4, 7], [6, 7]],
};

const OPS = { add: '+', sub: '−', mul: '×', div: '÷' };

export function parseFact(key) {
  const [op, dens] = key.split(':');
  const [d1, d2] = dens.split(',').map(Number);
  return { op, d1, d2 };
}

export function factKeyOf(op, d1, d2) { return `${op}:${d1},${d2}`; }

/** 대표값. 분자는 문항마다 달라지므로 참고용이다. */
export function answerOf(key) {
  const { op, d1, d2 } = parseFact(key);
  const r = op === 'sub' && d1 === d2
    ? calc(op, 2, d1, 1, d2)
    : calc(op, 1, d1, 1, d2);
  return r.num;
}

function calc(op, n1, d1, n2, d2) {
  let num, den;
  if (op === 'add') { num = n1 * d2 + n2 * d1; den = d1 * d2; }
  else if (op === 'sub') { num = n1 * d2 - n2 * d1; den = d1 * d2; }
  else if (op === 'mul') { num = n1 * n2; den = d1 * d2; }
  else { num = n1 * d2; den = d1 * n2; }          // 나눗셈 = 역수를 곱함
  return reduce(num, den);
}

export function allFacts() {
  const out = [];
  for (const [, pairs] of Object.entries(DEN_PAIRS)) {
    for (const [d1, d2] of pairs) {
      out.push(factKeyOf('add', d1, d2));
      // 1/2 − 1/2 밖에 안 되는 조합은 뺄셈 문제가 성립하지 않는다
      if (!(d1 === 2 && d2 === 2)) out.push(factKeyOf('sub', d1, d2));
    }
  }
  // 곱셈·나눗셈은 통분이 필요 없어 분모 쌍을 적게 쓴다
  for (const [d1, d2] of [[2, 3], [3, 4], [4, 5], [2, 5], [3, 5], [5, 6], [4, 7], [2, 7]]) {
    out.push(factKeyOf('mul', d1, d2), factKeyOf('div', d1, d2));
  }
  return out;
}

export function groups() {
  const all = allFacts();
  return [
    { id: 'addsub-same', label: '같은 분모',
      facts: all.filter((k) => /^(add|sub)/.test(k) && sameDen(k)) },
    { id: 'addsub-diff', label: '다른 분모',
      facts: all.filter((k) => /^(add|sub)/.test(k) && !sameDen(k)) },
    { id: 'mul', label: '분수 곱셈', facts: all.filter((k) => k.startsWith('mul')) },
    { id: 'div', label: '분수 나눗셈', facts: all.filter((k) => k.startsWith('div')) },
  ];
}

function sameDen(key) { const { d1, d2 } = parseFact(key); return d1 === d2; }

export function newFactOrder() { return orderByGroups(groups()); }

export function placementFacts() {
  return ['add:4,4', 'sub:5,5', 'add:2,4', 'sub:3,6', 'add:2,3', 'sub:3,4',
          'mul:2,3', 'mul:3,4', 'div:2,3', 'div:3,5', 'add:5,6', 'sub:4,5'];
}

export function canUse(variant, key) {
  const { op } = parseFact(key);
  if (variant === 'missing') return op === 'add' || op === 'sub';
  return true;
}

/** 분자를 뽑는다. 뺄셈은 결과가 음수가 되지 않게, 진분수 범위로. */
function pickNumerators(op, d1, d2) {
  const n1 = randInt(1, Math.max(1, d1 - 1));
  let n2 = randInt(1, Math.max(1, d2 - 1));
  if (op === 'sub') {
    // n1/d1 >= n2/d2 가 되도록
    let guard = 0;
    while (n1 * d2 <= n2 * d1 && guard++ < 20) n2 = randInt(1, Math.max(1, d2 - 1));
    if (n1 * d2 <= n2 * d1) return null;   // 만들 수 없는 조합
  }
  return { n1, n2 };
}

export function diagnose(key, given, ctx) {
  const { op, d1, d2 } = parseFact(key);
  const variant = ctx?.variant || 'basic';
  const sign = OPS[op];

  if (variant === 'compare') {
    return ctx.left > ctx.right
      ? `${ctx.leftText} 가 더 커요`
      : ctx.left < ctx.right ? `${ctx.rightText} 가 더 커요` : '두 분수가 같아요';
  }
  if (variant === 'missing') {
    if (given === ctx.missingValue) return null;
    return `빈칸에 ${ctx.missingValue} 이 들어가야 ${ctx.resultText} 가 돼요`;
  }

  // basic — 아이가 낸 분수를 그대로 읽어서 무슨 실수인지 짚는다
  const g = given || {};
  const gn = Number(g.num), gd = Number(g.den);
  const ans = ctx.answer;
  if (!Number.isFinite(gn) || !Number.isFinite(gd) || gd === 0) return '분수를 채워 주세요';

  if (gn * ans.den === ans.num * gd) return '계산은 맞았어요. 약분만 하면 돼요';

  if ((op === 'add' || op === 'sub') && gd === d1 + d2) {
    return '분모끼리도 더하면 안 돼요. 통분해서 분모를 맞춰요';
  }
  if ((op === 'add' || op === 'sub') && d1 !== d2 && (gd === d1 || gd === d2)) {
    return '통분을 안 하고 분자끼리만 계산했어요';
  }
  if (op === 'div' && gn * ctx.n2 === ctx.n1 * gd) {
    return '나눗셈은 뒤 분수를 뒤집어서 곱해요';
  }
  if (op === 'mul' && gd === d1 * d2 && gn !== ctx.n1 * ctx.n2) {
    return '분자끼리 곱했는지 확인해 보세요';
  }
  return `${ctx.leftText} ${sign} ${ctx.rightText} = ${ctx.answerText} 예요`;
}

// ── 형태별 ───────────────────────────────────────────────────────────

function qBasic(key) {
  const { op, d1, d2 } = parseFact(key);
  const ns = pickNumerators(op, d1, d2);
  if (!ns) return null;
  const { n1, n2 } = ns;
  const ans = calc(op, n1, d1, n2, d2);

  return {
    answer: { type: 'frac', num: ans.num, den: ans.den, requireReduced: true },
    mode: 'input',
    ctxExtra: {
      n1, n2, answer: ans,
      leftText: `${n1}/${d1}`, rightText: `${n2}/${d2}`,
      answerText: ans.den === 1 ? String(ans.num) : `${ans.num}/${ans.den}`,
    },
    render: { type: 'expr', tokens: [
      fracTok(n1, d1), tok(OPS[op]), fracTok(n2, d2), tok('='), fracTok('?', '?', true),
    ] },
    hint: op === 'div' ? '뒤 분수를 뒤집어서 곱해요'
        : (op === 'add' || op === 'sub') && d1 !== d2 ? '분모를 같게 만든 다음 계산해요'
        : '기약분수로 답해요',
  };
}

function qCompare(key) {
  const { d1, d2 } = parseFact(key);
  const n1 = randInt(1, Math.max(1, d1 - 1));
  const n2 = randInt(1, Math.max(1, d2 - 1));
  const left = n1 / d1, right = n2 / d2;
  // "왼쪽이 더 크다" 가 맞는가?
  const truthy = left > right;
  return {
    answer: { type: 'ox', value: truthy ? 1 : 0 },
    mode: 'ox',
    ctxExtra: { left, right, leftText: `${n1}/${d1}`, rightText: `${n2}/${d2}` },
    render: { type: 'expr', ox: true, tokens: [
      fracTok(n1, d1), tok('>'), fracTok(n2, d2),
    ] },
    hint: '왼쪽이 더 크면 O',
  };
}

function qMissing(key) {
  const { op, d1, d2 } = parseFact(key);
  const ns = pickNumerators(op, d1, d2);
  if (!ns) return null;
  const { n1, n2 } = ns;
  const ans = calc(op, n1, d1, n2, d2);
  return {
    answer: { type: 'int', value: n2, maxLen: 2 },
    mode: 'input',
    ctxExtra: {
      missingValue: n2, n1, n2, answer: ans,
      leftText: `${n1}/${d1}`, rightText: `${n2}/${d2}`,
      resultText: ans.den === 1 ? String(ans.num) : `${ans.num}/${ans.den}`,
      answerText: ans.den === 1 ? String(ans.num) : `${ans.num}/${ans.den}`,
    },
    render: { type: 'expr', tokens: [
      fracTok(n1, d1), tok(OPS[op]), fracTok('?', d2, true), tok('='),
      fracTok(ans.num, ans.den),
    ] },
    hint: '빈칸의 분자를 찾아요',
  };
}

const BUILDERS = { basic: qBasic, compare: qCompare, missing: qMissing };

export function makeQuestion(key, box = 0, variant = 'basic') {
  let use = BUILDERS[variant] && canUse(variant, key) ? variant : 'basic';
  let built = BUILDERS[use](key);
  // 분자를 못 뽑는 조합(뺄셈에서 결과가 음수가 되는 경우)은 비교 문제로 돌린다
  if (!built) { use = 'compare'; built = qCompare(key); }
  const { op, d1, d2 } = parseFact(key);
  return {
    skillId: id,
    factKey: key,
    variant: use,
    prompt: `${OPS[op]} (분모 ${d1}, ${d2})`,
    answer: built.answer,
    mode: built.mode,
    choices: built.choices,
    render: built.render,
    hint: built.hint,
    ctx: { variant: use, ...(built.ctxExtra || {}) },
  };
}
