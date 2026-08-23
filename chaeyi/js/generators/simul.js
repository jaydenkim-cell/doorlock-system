/**
 * 연립방정식 (중2)
 *
 * 답이 (x, y) 두 개다 — 이 앱에서 처음으로 숫자 하나가 아닌 답이 나온다
 * (`answer.js` 의 `pair` 타입). factKey 는 **푸는 방법**으로 잡는다.
 * 가감법으로 바로 없어지는 꼴과, 한쪽을 몇 배 해야 하는 꼴은 벽이 다르다.
 */

import { randInt, pick, tok, orderByGroups } from './_util.js';

export const id = 'simul';
export const title = '연립방정식';
export const emoji = '⑂';
export const mapTitle = '연립방정식 지도';
export const targetMs = 60000;   // 두 식을 다뤄야 해서 가장 길다

export const VARIANTS = [
  { id: 'basic', minLevel: 1, weight: 8 },
  { id: 'check', minLevel: 3, weight: 3 },   // 주어진 (x,y) 가 해가 맞나
];

const FORMS = [
  { id: 'elim-direct', label: '바로 소거' },   // y 계수가 +1, −1 로 맞아떨어짐
  { id: 'elim-scale',  label: '배로 만들어 소거' },
  { id: 'subst',       label: '대입법' },      // 한 식이 x = … 꼴
];

export function parseFact(key) { return { form: key }; }
export function factKeyOf(form) { return form; }
export function answerOf() { return 0; }

export function allFacts() { return FORMS.map((f) => f.id); }

export function groups() {
  return FORMS.map((f) => ({ id: f.id, label: f.label, facts: [f.id] }));
}

export function newFactOrder() { return orderByGroups(groups()); }

export function placementFacts() {
  return ['elim-direct', 'elim-direct', 'elim-direct', 'elim-scale', 'elim-scale',
          'elim-scale', 'subst', 'subst', 'subst', 'elim-direct', 'elim-scale', 'subst'];
}

export function canUse() { return true; }

const nz = () => pick([-1, 1]) * randInt(1, 6);
const term = (c, v) => (c === 1 ? v : c === -1 ? `−${v}` : `${c}${v}`);
const plus = (c, v) => (c < 0 ? ` − ${term(-c, v)}` : ` + ${term(c, v)}`);

/** 해를 먼저 정하고 계수를 맞춘다. 그래야 답이 깔끔한 정수로 떨어진다. */
function build(form) {
  const x = pick([-1, 1]) * randInt(1, 8);
  const y = pick([-1, 1]) * randInt(1, 8);

  if (form === 'subst') {
    // x = my + n  /  ax + by = c
    const m = nz(), n = pick([-1, 1]) * randInt(1, 6);
    const xx = m * y + n;                     // x 를 이 식에 맞춰 다시 잡는다
    const a = nz(), b = nz();
    const c = a * xx + b * y;
    return {
      x: xx, y,
      lines: [`x = ${term(m, 'y')}${n < 0 ? ` − ${-n}` : ` + ${n}`}`,
              `${term(a, 'x')}${plus(b, 'y')} = ${c}`],
      how: '위 식을 아래에 대입해요',
    };
  }

  let a1 = nz(), b1 = nz(), a2 = nz(), b2 = nz();
  if (form === 'elim-direct') {
    b2 = -b1;                                  // 그냥 더하면 y 가 사라진다
    while (a1 * b2 - a2 * b1 === 0) { a2 = nz(); }
  } else {
    // 한쪽을 정수배 해야 소거되는 꼴
    const k = pick([2, 3]);
    b2 = -b1 * k;
    while (a1 * b2 - a2 * b1 === 0) { a2 = nz(); }
  }
  const c1 = a1 * x + b1 * y;
  const c2 = a2 * x + b2 * y;
  return {
    x, y,
    lines: [`${term(a1, 'x')}${plus(b1, 'y')} = ${c1}`,
            `${term(a2, 'x')}${plus(b2, 'y')} = ${c2}`],
    how: form === 'elim-direct' ? '두 식을 더하면 y 가 사라져요' : '한 식을 몇 배 해서 소거해요',
  };
}

export function diagnose(key, given, ctx) {
  const variant = ctx?.variant || 'basic';

  if (variant === 'check') {
    return ctx.shownOk
      ? `맞습니다. (${ctx.x}, ${ctx.y}) 가 해입니다`
      : `(${ctx.shownX}, ${ctx.shownY}) 는 해가 아닙니다. 해는 (${ctx.x}, ${ctx.y}) 입니다`;
  }

  const g = given || {};
  const gx = Number(g.a), gy = Number(g.b);
  if (!Number.isFinite(gx) || !Number.isFinite(gy)) return 'x 와 y 를 모두 채워 주세요';
  if (gx === ctx.x && gy === ctx.y) return null;
  if (gx === ctx.y && gy === ctx.x) return 'x 와 y 를 바꿔 썼습니다';
  if (gx === ctx.x) return `x 는 맞습니다. y 를 다시 구해 보세요 (y = ${ctx.y})`;
  if (gy === ctx.y) return `y 는 맞습니다. x 를 다시 구해 보세요 (x = ${ctx.x})`;
  if (gx === -ctx.x && gy === -ctx.y) return '부호가 모두 반대입니다. 소거할 때 부호를 확인하세요';
  return `해는 x = ${ctx.x}, y = ${ctx.y} 입니다. ${ctx.how}`;
}

function qBasic(key) {
  const b = build(key);
  return {
    answer: { type: 'pair', a: b.x, b: b.y, allowNegative: true },
    mode: 'input',
    ctxExtra: { ...b, form: key, text: b.lines.join(' , ') },
    render: { type: 'lines', lines: b.lines, blank: 'x = ?,  y = ?' },
    hint: b.how,
  };
}

function qCheck(key) {
  const b = build(key);
  const truthy = Math.random() < 0.5;
  const shownX = truthy ? b.x : b.x + pick([-2, -1, 1, 2]);
  const shownY = truthy ? b.y : b.y + pick([-1, 1]);
  const shownOk = shownX === b.x && shownY === b.y;
  return {
    answer: { type: 'ox', value: shownOk ? 1 : 0 },
    mode: 'ox',
    ctxExtra: { ...b, form: key, shownX, shownY, shownOk, text: b.lines.join(' , ') },
    render: { type: 'lines', lines: b.lines, tail: `x = ${shownX},  y = ${shownY}`, ox: true },
    hint: '해가 맞으면 O, 틀리면 X',
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
    render: built.render,
    hint: built.hint,
    ctx: { variant: use, ...built.ctxExtra },
  };
}
