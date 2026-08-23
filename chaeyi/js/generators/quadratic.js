/**
 * 인수분해와 이차방정식 (중3)
 *
 * 인수분해의 답은 `(x+2)(x+3)` 같은 **식**이다. 이걸 직접 입력받으려면
 * 수식 파서와 동치 판정기가 필요하다 — `(x+3)(x+2)` 도 같은 답이니까.
 * 그건 이 앱의 범위를 넘으므로 **보기 4개**로 낸다. 오답 선지를 부호 실수와
 * 인수 쌍 실수로 만들면 교육적으로도 충분하다.
 *
 * 이차방정식의 해는 두 개다. 작은 근을 묻는 것으로 통일해 숫자 하나로 받는다.
 */

import { shuffle, randInt, pick, tok, expr, orderByGroups } from './_util.js';

export const id = 'quadratic';
export const title = '인수분해·이차방정식';
export const emoji = 'x²';
export const mapTitle = '이차식 지도';
export const targetMs = 25000;

export const VARIANTS = [
  { id: 'basic', minLevel: 1, weight: 7 },
  { id: 'check', minLevel: 3, weight: 3 },
];

const FORMS = [
  { id: 'fac-simple', label: 'x² + bx + c' },
  { id: 'fac-diff',   label: 'a² − b²' },
  { id: 'fac-square', label: '완전제곱식' },
  { id: 'solve',      label: '이차방정식의 해' },
];

export function parseFact(key) { return { form: key }; }
export function factKeyOf(form) { return form; }
export function answerOf() { return 0; }

export function allFacts() { return FORMS.map((f) => f.id); }

export function groups() {
  return [
    { id: 'factor', label: '인수분해', facts: ['fac-simple', 'fac-diff', 'fac-square'] },
    { id: 'solve',  label: '방정식 풀이', facts: ['solve'] },
  ];
}

export function newFactOrder() { return orderByGroups(groups()); }

export function placementFacts() {
  return ['fac-simple', 'fac-simple', 'fac-simple', 'fac-diff', 'fac-diff',
          'fac-square', 'fac-square', 'solve', 'solve', 'solve', 'fac-simple', 'fac-diff'];
}

export function canUse() { return true; }

/** (x + p)(x + q) 를 사람이 읽는 문자열로. p 가 음수면 (x − 3) 으로. */
function fac(p, q) {
  const t = (n) => (n < 0 ? `(x − ${-n})` : `(x + ${n})`);
  return t(p) + t(q);
}

function quadText(b, c) {
  const bs = b === 0 ? '' : b < 0 ? ` − ${-b}x` : ` + ${b}x`;
  const cs = c === 0 ? '' : c < 0 ? ` − ${-c}` : ` + ${c}`;
  return `x²${bs}${cs}`;
}

function build(form) {
  if (form === 'fac-diff') {
    const a = randInt(2, 9);
    const text = `x² − ${a * a}`;
    const right = `(x + ${a})(x − ${a})`;
    return {
      text, right, p: a, q: -a,
      wrongs: [`(x − ${a})(x − ${a})`, `(x + ${a})(x + ${a})`, `(x + ${a * a})(x − 1)`],
      how: '합과 차의 곱으로 인수분해해요',
    };
  }
  if (form === 'fac-square') {
    const a = pick([-1, 1]) * randInt(2, 8);
    const b = 2 * a, c = a * a;
    return {
      text: quadText(b, c), right: `(x ${a < 0 ? '− ' + -a : '+ ' + a})²`, p: a, q: a,
      wrongs: [`(x ${a < 0 ? '+ ' + -a : '− ' + a})²`, fac(a, -a), fac(a, a + 1)],
      how: '완전제곱식인지 확인해요',
    };
  }
  if (form === 'solve') {
    let p = pick([-1, 1]) * randInt(1, 9);
    let q = pick([-1, 1]) * randInt(1, 9);
    while (p === q) q = pick([-1, 1]) * randInt(1, 9);
    // (x + p)(x + q) = 0 → 근은 −p, −q
    const roots = [-p, -q].sort((m, n) => m - n);
    return {
      text: `${quadText(p + q, p * q)} = 0`,
      roots, small: roots[0], p, q,
      how: '인수분해해서 각 괄호를 0으로 만드는 값을 찾아요',
    };
  }
  // fac-simple
  let p = pick([-1, 1]) * randInt(1, 9);
  let q = pick([-1, 1]) * randInt(1, 9);
  while (p === q) q = pick([-1, 1]) * randInt(1, 9);
  return {
    text: quadText(p + q, p * q),
    right: fac(p, q), p, q,
    wrongs: [fac(-p, -q), fac(p, -q), fac(-p, q)],   // 부호 실수 세 종류
    how: '더해서 가운데 수, 곱해서 끝 수가 되는 두 수를 찾아요',
  };
}

export function diagnose(key, given, ctx) {
  const variant = ctx?.variant || 'basic';

  if (variant === 'check') {
    return ctx.shownOk
      ? `맞습니다. ${ctx.text} = ${ctx.right} 입니다`
      : `${ctx.shown} 은 아닙니다. ${ctx.text} = ${ctx.right} 입니다`;
  }

  if (key === 'solve') {
    const v = Number(given);
    if (v === ctx.small) return null;
    if (ctx.roots.includes(v)) return `그것도 해지만 더 작은 근은 ${ctx.small} 입니다`;
    if (ctx.roots.includes(-v)) return '부호가 반대입니다. (x + p) = 0 이면 x = −p 입니다';
    return `해는 ${ctx.roots.join(', ')} 이고 더 작은 쪽은 ${ctx.small} 입니다`;
  }

  // 인수분해는 보기라 given 이 선택지 번호가 아니라 값이다
  return `${ctx.text} = ${ctx.right} 입니다. ${ctx.how}`;
}

function qBasic(key) {
  const b = build(key);

  if (key === 'solve') {
    return {
      answer: { type: 'int', value: b.small, allowNegative: true, maxLen: 3 },
      mode: 'input',
      ctxExtra: { ...b, form: key },
      render: expr(tok(b.text)),
      hint: '더 작은 근을 답하세요',
    };
  }

  // 인수분해 — 보기 4개. 오답은 전부 부호·인수 쌍 실수로 만든다.
  const options = shuffle([b.right, ...b.wrongs]);
  return {
    answer: { type: 'text', value: b.right },
    mode: 'choice',
    choices: options,
    ctxExtra: { ...b, form: key },
    render: expr(tok(b.text), tok('='), tok('?', true)),
    hint: b.how,
  };
}

function qCheck(key) {
  const b = build(key === 'solve' ? 'fac-simple' : key);
  const truthy = Math.random() < 0.5;
  const shown = truthy ? b.right : b.wrongs[0];
  return {
    answer: { type: 'ox', value: truthy ? 1 : 0 },
    mode: 'ox',
    ctxExtra: { ...b, form: key, shown, shownOk: truthy },
    render: { ...expr(tok(b.text), tok('='), tok(shown)), ox: true },
    hint: '맞으면 O, 틀리면 X',
  };
}

const BUILDERS = { basic: qBasic, check: qCheck };

export function makeQuestion(key, box = 0, variant = 'basic') {
  const use = BUILDERS[variant] ? variant : 'basic';
  const built = BUILDERS[use](key);
  return {
    skillId: id,
    factKey: key,
    variant: use,
    prompt: built.ctxExtra.text,
    answer: built.answer,
    mode: built.mode,
    choices: built.choices,
    render: built.render,
    hint: built.hint,
    ctx: { variant: use, ...built.ctxExtra },
  };
}
