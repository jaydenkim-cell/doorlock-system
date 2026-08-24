/**
 * 정수와 유리수 사칙 (중1)
 *
 * 중학 수학의 첫 관문이자, 이후 모든 단원의 계산 실수가 여기서 온다.
 * 틀리는 이유는 계산이 아니라 **부호**다. 그래서 factKey 를 구체적 수가 아니라
 * **연산 + 부호 조합**으로 잡는다 — `sub:pn` = 양수 − 음수.
 * 수는 매번 달라져도 "양수에서 음수를 빼는 일"이라는 숙련도는 하나로 추적된다.
 */

import { shuffle, randInt, pick, tok, expr, orderByGroups } from './_util.js';

export const id = 'integers';
export const title = '정수와 유리수';
export const emoji = '±';
export const mapTitle = '정수 지도';
export const targetMs = 8000;

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
  { id: 'truefalse', minLevel: 2, weight: 3 },
  { id: 'missing',   minLevel: 3, weight: 3 },
  { id: 'chain',     minLevel: 4, weight: 2 },   // 세 수 연산
];

const OPS = { add: '+', sub: '−', mul: '×', div: '÷' };
const SIGNS = ['pp', 'pn', 'np', 'nn'];
const SIGN_LABEL = { p: '양수', n: '음수' };

export function parseFact(key) {
  const [op, sg] = key.split(':');
  return { op, s1: sg[0], s2: sg[1] };
}

export function factKeyOf(op, sg) { return `${op}:${sg}`; }

export function allFacts() {
  const out = [];
  for (const op of ['add', 'sub', 'mul', 'div']) {
    for (const sg of SIGNS) out.push(factKeyOf(op, sg));
  }
  return out;      // 16문항 키
}

export function groups() {
  const all = allFacts();
  return [
    { id: 'add', label: '덧셈', facts: all.filter((k) => k.startsWith('add')) },
    { id: 'sub', label: '뺄셈', facts: all.filter((k) => k.startsWith('sub')) },
    { id: 'mul', label: '곱셈', facts: all.filter((k) => k.startsWith('mul')) },
    { id: 'div', label: '나눗셈', facts: all.filter((k) => k.startsWith('div')) },
  ];
}

export function newFactOrder() { return orderByGroups(groups()); }

export function placementFacts() {
  return ['add:pn', 'add:nn', 'sub:pn', 'sub:np', 'sub:nn', 'mul:pn',
          'mul:nn', 'div:pn', 'div:nn', 'add:np', 'mul:np', 'sub:pp'];
}

export function canUse(variant, key) {
  const { op } = parseFact(key);
  if (variant === 'chain') return op === 'add' || op === 'sub';
  if (variant === 'missing') return op !== 'div';   // 나눗셈 역산은 중1에 과하다
  return true;
}

export function answerOf(key) {
  const { op, s1, s2 } = parseFact(key);
  const a = s1 === 'n' ? -6 : 6, b = s2 === 'n' ? -3 : 3;
  return calc(op, a, b);
}

function calc(op, a, b) {
  if (op === 'add') return a + b;
  if (op === 'sub') return a - b;
  if (op === 'mul') return a * b;
  return a / b;
}

/** 부호 조합에 맞는 두 수. 나눗셈은 딱 떨어지게 만든다. */
function pickNums(op, s1, s2) {
  let a, b;
  if (op === 'div') {
    b = randInt(2, 9);
    const q = randInt(2, 9);
    a = b * q;
  } else if (op === 'mul') {
    a = randInt(2, 9);
    b = randInt(2, 9);
  } else {
    a = randInt(2, 20);
    b = randInt(2, 20);
  }
  return { a: s1 === 'n' ? -a : a, b: s2 === 'n' ? -b : b };
}

/** −3 은 괄호를 씌워 (−3) 으로 보여준다. 중1 교과서 표기다. */
function show(v) { return v < 0 ? `(${v})` : String(v); }

export function diagnose(key, given, ctx) {
  const { op, s1, s2 } = parseFact(key);
  const variant = ctx?.variant || 'basic';
  const sign = OPS[op];
  const v = Number(given);

  if (variant === 'truefalse') {
    return ctx.shown === ctx.value
      ? `맞아요. ${ctx.text} = ${ctx.value} 입니다`
      : `${ctx.text} 는 ${ctx.shown}이 아니라 ${ctx.value} 입니다`;
  }
  if (variant === 'missing') {
    if (v === ctx.b) return null;
    return `빈칸이 ${show(ctx.b)} 일 때 ${ctx.value} 가 됩니다`;
  }
  if (variant === 'chain') {
    if (v === ctx.value) return null;
    return `${ctx.text} = ${ctx.value} 입니다. 왼쪽부터 차례로 계산해요`;
  }

  if (!Number.isFinite(v)) return '숫자를 입력해 주세요';
  if (v === ctx.value) return null;

  // 부호만 틀린 경우가 압도적으로 많다 — 그걸 가장 먼저 짚는다
  if (v === -ctx.value) return '값은 맞고 부호가 반대입니다';
  if (op === 'sub' && v === ctx.a + ctx.b) return '뺄셈을 덧셈으로 계산했습니다. 빼는 수의 부호를 바꿔 더해요';
  if (op === 'sub' && s2 === 'n' && v === ctx.a - Math.abs(ctx.b)) {
    return '음수를 빼면 더하는 것과 같습니다';
  }
  if (op === 'add' && v === ctx.a - ctx.b) return '덧셈을 뺄셈으로 계산했습니다';
  if ((op === 'mul' || op === 'div') && Math.abs(v) === Math.abs(ctx.value)) {
    return s1 === s2 ? '같은 부호끼리는 결과가 양수입니다' : '다른 부호끼리는 결과가 음수입니다';
  }
  if (op === 'mul' && v === ctx.a + ctx.b) return '곱셈 자리에 덧셈을 했습니다';
  return `${ctx.text} = ${ctx.value} 입니다`;
}

// ── 형태별 ───────────────────────────────────────────────────────────

function qBasic(key) {
  const { op, s1, s2 } = parseFact(key);
  const { a, b } = pickNums(op, s1, s2);
  const value = calc(op, a, b);
  const text = `${show(a)} ${OPS[op]} ${show(b)}`;
  return {
    answer: { type: 'int', value, allowNegative: true, maxLen: 4 },
    mode: 'input',
    ctxExtra: { a, b, value, text },
    render: expr(tok(show(a)), tok(OPS[op]), tok(show(b)), tok('='), tok('?', true)),
    hint: op === 'sub' ? '빼는 수의 부호를 바꿔 더해요'
        : op === 'mul' || op === 'div' ? '같은 부호면 +, 다른 부호면 −'
        : '수직선에서 어느 쪽으로 가는지 생각해요',
  };
}

function qTrueFalse(key) {
  const { op, s1, s2 } = parseFact(key);
  const { a, b } = pickNums(op, s1, s2);
  const value = calc(op, a, b);
  const truthy = Math.random() < 0.5;
  const shown = truthy ? value : -value || value + 1;   // 부호 반대가 가장 좋은 함정
  const text = `${show(a)} ${OPS[op]} ${show(b)}`;
  return {
    answer: { type: 'ox', value: truthy && shown === value ? 1 : 0 },
    mode: 'ox',
    ctxExtra: { a, b, value, shown, text },
    render: { ...expr(tok(show(a)), tok(OPS[op]), tok(show(b)), tok('='), tok(shown)), ox: true },
    hint: '맞으면 O, 틀리면 X',
  };
}

function qMissing(key) {
  const { op, s1, s2 } = parseFact(key);
  const { a, b } = pickNums(op, s1, s2);
  const value = calc(op, a, b);
  const text = `${show(a)} ${OPS[op]} ? = ${value}`;
  return {
    answer: { type: 'int', value: b, allowNegative: true, maxLen: 4 },
    mode: 'input',
    ctxExtra: { a, b, value, text },
    render: expr(tok(show(a)), tok(OPS[op]), tok('?', true), tok('='), tok(value)),
    hint: '빈칸에 들어갈 수를 찾아요 (부호도 함께)',
  };
}

function qChain(key) {
  const { op, s1, s2 } = parseFact(key);
  const { a, b } = pickNums(op, s1, s2);
  const c = pick([-1, 1]) * randInt(2, 12);
  const mid = calc(op, a, b);
  const op2 = pick(['add', 'sub']);
  const value = calc(op2, mid, c);
  const text = `${show(a)} ${OPS[op]} ${show(b)} ${OPS[op2]} ${show(c)}`;
  return {
    answer: { type: 'int', value, allowNegative: true, maxLen: 4 },
    mode: 'input',
    ctxExtra: { a, b, c, value, text },
    render: expr(tok(show(a)), tok(OPS[op]), tok(show(b)), tok(OPS[op2]), tok(show(c)),
                 tok('='), tok('?', true)),
    hint: '왼쪽부터 차례로 계산해요',
  };
}

const BUILDERS = { basic: qBasic, truefalse: qTrueFalse, missing: qMissing, chain: qChain };

export function makeQuestion(key, box = 0, variant = 'basic') {
  const use = BUILDERS[variant] && canUse(variant, key) ? variant : 'basic';
  const built = BUILDERS[use](key);
  return {
    skillId: id,
    factKey: key,
    variant: use,
    prompt: built.ctxExtra.text,
    answer: built.answer,
    mode: built.mode,
    render: built.render,
    hint: built.hint,
    ctx: { variant: use, ...built.ctxExtra },
  };
}
