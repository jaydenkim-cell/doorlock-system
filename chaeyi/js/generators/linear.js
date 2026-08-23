/**
 * 일차방정식 (중1)
 *
 * factKey 는 방정식 하나하나가 아니라 **꼴(form)** 이다. `ax+b=c` 와
 * `ax+b=cx+d` 는 아이가 넘어야 할 벽이 다르다. 계수는 매번 달라져도
 * "미지항을 한쪽으로 모으는 일"이라는 숙련도는 하나로 추적된다.
 *
 * 답이 분수가 되는 경우가 있어 `frac` 타입도 쓴다. 정수로 떨어지면 `int`.
 */

import { randInt, pick, reduce, tok, expr, orderByGroups } from './_util.js';

export const id = 'linear';
export const title = '일차방정식';
export const emoji = '𝑥';
export const mapTitle = '방정식 지도';
export const targetMs = 30000;    // 곱셈구구의 10배. 30초에 푸는 게 정상이다

export const VARIANTS = [
  { id: 'basic',   minLevel: 1, weight: 7 },
  { id: 'check',   minLevel: 2, weight: 3 },   // x = 3 이 해가 맞나? (O/X)
  { id: 'word',    minLevel: 4, weight: 2 },   // 짧은 문장제
];

/** 꼴은 넘어야 할 벽 순서대로 */
const FORMS = [
  { id: 'ax=c',      label: 'ax = c' },
  { id: 'ax+b=c',    label: 'ax + b = c' },
  { id: 'ax+b=cx+d', label: 'ax + b = cx + d' },
  { id: 'a(x+b)=c',  label: 'a(x + b) = c' },
  { id: 'x/a+b=c',   label: 'x/a + b = c' },
];

export function parseFact(key) { return { form: key }; }
export function factKeyOf(form) { return form; }
export function answerOf() { return 0; }   // 계수가 매번 달라 대표값이 의미 없다

export function allFacts() { return FORMS.map((f) => f.id); }

export function groups() {
  return [
    { id: 'simple', label: '기본꼴', facts: ['ax=c', 'ax+b=c'] },
    { id: 'both',   label: '양변에 x', facts: ['ax+b=cx+d'] },
    { id: 'paren',  label: '괄호·분수', facts: ['a(x+b)=c', 'x/a+b=c'] },
  ];
}

export function newFactOrder() { return orderByGroups(groups()); }

export function placementFacts() {
  return ['ax=c', 'ax=c', 'ax+b=c', 'ax+b=c', 'ax+b=cx+d', 'ax+b=cx+d',
          'a(x+b)=c', 'a(x+b)=c', 'x/a+b=c', 'ax+b=c', 'ax+b=cx+d', 'ax=c'];
}

export function canUse(variant, key) {
  if (variant === 'word') return key === 'ax=c' || key === 'ax+b=c';
  return true;
}

const nz = () => pick([-1, 1]) * randInt(2, 9);   // 0 이 아닌 계수

/**
 * 꼴에 맞는 방정식을 만든다. 해가 먼저 정해지고 계수를 거기 맞춘다 —
 * 그래야 답이 지저분해지지 않는다.
 */
function build(form) {
  const x = pick([-1, 1]) * randInt(1, 12);

  if (form === 'ax=c') {
    const a = nz();
    return { x, tokens: [tok(`${a}x`), tok('='), tok(a * x)], text: `${a}x = ${a * x}` };
  }
  if (form === 'ax+b=c') {
    const a = nz(), b = pick([-1, 1]) * randInt(1, 15);
    const c = a * x + b;
    const bs = b < 0 ? `− ${-b}` : `+ ${b}`;
    return { x, tokens: [tok(`${a}x`), tok(bs.split(' ')[0]), tok(bs.split(' ')[1]), tok('='), tok(c)],
             text: `${a}x ${bs} = ${c}` };
  }
  if (form === 'ax+b=cx+d') {
    let a = nz(), c = nz();
    while (a === c) c = nz();                 // 양변 계수가 같으면 일차방정식이 아니다
    const b = pick([-1, 1]) * randInt(1, 12);
    const d = (a - c) * x + b;
    const bs = b < 0 ? `− ${-b}` : `+ ${b}`;
    const ds = d < 0 ? `− ${-d}` : `+ ${d}`;
    return { x,
      tokens: [tok(`${a}x`), tok(bs.split(' ')[0]), tok(bs.split(' ')[1]), tok('='),
               tok(`${c}x`), tok(ds.split(' ')[0]), tok(ds.split(' ')[1])],
      text: `${a}x ${bs} = ${c}x ${ds}` };
  }
  if (form === 'a(x+b)=c') {
    const a = nz(), b = pick([-1, 1]) * randInt(1, 9);
    const c = a * (x + b);
    const bs = b < 0 ? `− ${-b}` : `+ ${b}`;
    return { x, tokens: [tok(`${a}(x ${bs})`), tok('='), tok(c)], text: `${a}(x ${bs}) = ${c}` };
  }
  // x/a + b = c  — x 가 a 의 배수가 되게 만든다
  const a = randInt(2, 6);
  const xm = a * (pick([-1, 1]) * randInt(1, 6));
  const b = pick([-1, 1]) * randInt(1, 10);
  const c = xm / a + b;
  const bs = b < 0 ? `− ${-b}` : `+ ${b}`;
  return { x: xm, tokens: [tok(`x/${a}`), tok(bs.split(' ')[0]), tok(bs.split(' ')[1]), tok('='), tok(c)],
           text: `x/${a} ${bs} = ${c}` };
}

export function diagnose(key, given, ctx) {
  const variant = ctx?.variant || 'basic';
  const v = Number(given);

  if (variant === 'check') {
    return ctx.shown === ctx.x
      ? `맞습니다. x = ${ctx.x} 가 해입니다`
      : `x = ${ctx.shown} 을 넣으면 등식이 성립하지 않습니다. 해는 x = ${ctx.x} 입니다`;
  }
  if (variant === 'word') {
    if (v === ctx.x) return null;
    return `식을 세우면 ${ctx.text} 이고, x = ${ctx.x} 입니다`;
  }

  if (!Number.isFinite(v)) return '숫자를 입력해 주세요';
  if (v === ctx.x) return null;
  if (v === -ctx.x) return '부호가 반대입니다. 이항할 때 부호가 바뀌는지 확인하세요';
  if (ctx.form === 'a(x+b)=c') return '괄호를 먼저 풀거나 양변을 나눠 보세요';
  if (ctx.form === 'ax+b=cx+d') return 'x 항은 한쪽으로, 숫자는 반대쪽으로 모아요';
  if (ctx.form === 'x/a+b=c') return '양변에 분모를 곱해 분수를 없애고 시작해요';
  return `${ctx.text} 의 해는 x = ${ctx.x} 입니다`;
}

// ── 형태별 ───────────────────────────────────────────────────────────

function qBasic(key) {
  const b = build(key);
  return {
    answer: { type: 'int', value: b.x, allowNegative: true, maxLen: 4 },
    mode: 'input',
    ctxExtra: { ...b, form: key },
    render: { type: 'expr', tokens: [...b.tokens] },
    hint: 'x 의 값을 구해요',
  };
}

function qCheck(key) {
  const b = build(key);
  const truthy = Math.random() < 0.5;
  const shown = truthy ? b.x : b.x + pick([-2, -1, 1, 2]);
  return {
    answer: { type: 'ox', value: truthy && shown === b.x ? 1 : 0 },
    mode: 'ox',
    ctxExtra: { ...b, form: key, shown },
    render: { type: 'expr', ox: true,
      tokens: [...b.tokens, tok('  ,  '), tok(`x = ${shown}`)] },
    hint: '해가 맞으면 O, 틀리면 X',
  };
}

const WORDS = [
  (a, c) => `어떤 수에 ${a}를 곱했더니 ${c} 가 되었습니다. 어떤 수는?`,
  (a, c) => `연필 한 자루가 ${a}원입니다. ${c}원으로 몇 자루 살 수 있나요?`,
];

function qWord(key) {
  const a = randInt(2, 9);
  const x = randInt(2, 12);
  const c = a * x;
  const text = `${a}x = ${c}`;
  return {
    answer: { type: 'int', value: x, maxLen: 3 },
    mode: 'input',
    ctxExtra: { x, text, form: key },
    render: { type: 'text', text: pick(WORDS)(a, c) },
    hint: '식을 세워 보세요',
  };
}

const BUILDERS = { basic: qBasic, check: qCheck, word: qWord };

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
