/**
 * 두 자리 덧셈·뺄셈 (받아올림 / 받아내림) 문항 생성기
 *
 * 곱셈구구 생성기와 완전히 같은 인터페이스를 따른다.
 * (allFacts / groups / makeQuestion / diagnose / answerOf)
 * 세션 엔진은 어떤 스킬인지 몰라도 되게 하기 위함이다.
 *
 * factKey 설계가 핵심이다. "37+48" 같은 구체적인 문제를 키로 삼으면
 * 경우의 수가 너무 많아 간격 반복이 작동하지 않는다. 그래서 키는
 * 실제로 걸려 넘어지는 지점인 "일의 자리 계산"으로 잡는다.
 *   37+48 → 핵심은 7+8 (받아올림)
 *   45-18 → 핵심은 15-8 (받아내림)
 * 같은 7+8을 여러 옷을 입혀 반복시키면서 숙련도는 하나로 추적한다.
 */

export const id = 'addsub';
export const title = '받아올림·받아내림';
export const emoji = '➕';
export const mapTitle = '받아올림 지도';
export const targetMs = 5000;            // 자리올림을 따져야 해서 곱셈구구보다 여유

/** 곱셈구구와 같은 형태 체계. minLevel 에서 열리고 weight 만큼 자주 나온다. */
export const VARIANTS = [
  { id: 'basic',     minLevel: 1, weight: 6 },  // 37 + 48 = ?
  { id: 'missingB',  minLevel: 2, weight: 3 },  // 37 + ? = 85
  { id: 'truefalse', minLevel: 3, weight: 2 },  // 37 + 48 = 75 맞을까?
  { id: 'missingA',  minLevel: 4, weight: 2 },  // ? + 48 = 85
];

/** 이 스킬은 형태에 제약이 없다 (곱셈의 묶어세기 같은 그림 형태가 없으므로) */
export function canUse() { return true; }

/** 처음 배울 때 순서. 받아올림을 먼저, 받아내림을 나중에 — 그리고 섞는다. */
export function newFactOrder() {
  const f = allFacts();
  return [...shuffle(f.filter((k) => k.includes('+'))),
          ...shuffle(f.filter((k) => k.includes('-')))];
}

/** 진단 판 대표 문항 */
export function placementFacts() {
  return ['7+8', '9+4', '6+7', '8+5', '13-8', '15-7', '12-9', '16-8'];
}

export function parseFact(key) {
  const m = key.match(/^(\d+)([+-])(\d+)$/);
  return { a: Number(m[1]), op: m[2], b: Number(m[3]) };
}

export function answerOf(key) {
  const { a, op, b } = parseFact(key);
  return op === '+' ? a + b : a - b;
}

/** 받아올림이 있는 한 자리 덧셈 43개 + 받아내림이 있는 뺄셈 36개 = 79문항 */
export function allFacts() {
  const out = [];
  for (let a = 2; a <= 9; a++) {
    for (let b = 2; b <= 9; b++) if (a + b >= 10) out.push(`${a}+${b}`);
  }
  for (let ones = 1; ones <= 8; ones++) {
    for (let b = ones + 1; b <= 9; b++) out.push(`${10 + ones}-${b}`);
  }
  return out;
}

export function groups() {
  const facts = allFacts();
  return [
    { id: 'carry',  label: '받아올림', facts: facts.filter((f) => f.includes('+')) },
    { id: 'borrow', label: '받아내림', facts: facts.filter((f) => f.includes('-')) },
  ];
}

function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 핵심 한 자리 계산에 십의 자리 옷을 입혀 두 자리 문제로 만든다.
 * 초1은 아직 두 자리를 안 배웠으므로 plain 이면 옷을 입히지 않고
 * 7 + 8 / 15 − 8 을 그대로 낸다.
 */
function dress(key, plain) {
  const { a, op, b } = parseFact(key);
  if (plain) return { x: a, y: b, op };
  if (op === '+') {
    // a + b >= 10 이므로 십의 자리 합이 8을 넘으면 세 자리가 된다
    const t1 = randInt(1, 7);
    const t2 = randInt(1, Math.max(1, 8 - t1));
    return { x: t1 * 10 + a, y: t2 * 10 + b, op: '+' };
  }
  // a 는 10~18 형태. 십의 자리를 얹어 45 - 18 같은 모양으로 만든다.
  const ones = a - 10;
  const t1 = randInt(2, 9);
  const t2 = randInt(1, t1 - 1);
  return { x: t1 * 10 + ones, y: t2 * 10 + b, op: '-' };
}

/**
 * 실제 오류 패턴으로 오답 선지를 만든다.
 * 이 나이대 최다 실수는 단연 "받아올림/받아내림을 빠뜨림"이다.
 */
function distractorsFor(x, y, op, correct) {
  const pool = [];
  const push = (v) => {
    if (Number.isInteger(v) && v > 0 && v !== correct && !pool.includes(v)) pool.push(v);
  };

  if (op === '+') {
    push(correct - 10);              // 받아올림을 빠뜨림
    push(Math.floor(x / 10) * 10 + Math.floor(y / 10) * 10 + ((x % 10) + (y % 10)) % 10);
  } else {
    push(correct + 10);              // 받아내림을 빠뜨림
    // 자리마다 큰 수에서 작은 수를 빼버림 (45-18 → 33)
    push(Math.abs(Math.floor(x / 10) - Math.floor(y / 10)) * 10 + Math.abs((x % 10) - (y % 10)));
  }
  push(correct + 1);
  push(correct - 1);
  push(correct + 10);
  push(correct - 10);
  for (let d = 2; pool.length < 3 && d < 9; d++) { push(correct + d); push(correct - d); }

  const sorted = pool.sort((p, q) => Math.abs(p - correct) - Math.abs(q - correct));
  return shuffle(sorted.slice(0, 6)).slice(0, 3);
}

export function diagnose(key, given, ctx) {
  const correct = ctx ? (ctx.op === '+' ? ctx.x + ctx.y : ctx.x - ctx.y) : answerOf(key);
  const variant = ctx?.variant || 'basic';

  // 결과가 아니라 빠진 수를 묻는 형태는 다른 방식으로 설명한다
  if (variant === 'missingB') {
    if (given === ctx.y) return null;
    const got = ctx.op === '+' ? ctx.x + given : ctx.x - given;
    return `${ctx.x} ${ctx.op === '+' ? '+' : '−'} ${given} 은 ${got} 이라서 ${correct}이 안 돼요`;
  }
  if (variant === 'missingA') {
    if (given === ctx.x) return null;
    const got = ctx.op === '+' ? given + ctx.y : given - ctx.y;
    return `${given} ${ctx.op === '+' ? '+' : '−'} ${ctx.y} 는 ${got} 이라서 ${correct}이 안 돼요`;
  }
  if (variant === 'truefalse') {
    const sign = ctx.op === '+' ? '+' : '−';
    if (ctx.shown === correct) return `${ctx.x} ${sign} ${ctx.y} 는 ${correct}이 맞아요`;
    return `${ctx.x} ${sign} ${ctx.y} 는 ${ctx.shown}이 아니라 ${correct}이에요`;
  }

  if (given === correct) return null;
  if (!ctx) return '아직 익숙하지 않음';
  const { x, y, op } = ctx;
  if (op === '+') {
    if (given === correct - 10) return '받아올림을 빠뜨림';
    const noCarry = Math.floor(x / 10) * 10 + Math.floor(y / 10) * 10 + ((x % 10) + (y % 10)) % 10;
    if (given === noCarry) return '받아올림을 빠뜨림';
  } else {
    if (given === correct + 10) return '받아내림을 빠뜨림';
    const flip = Math.abs(Math.floor(x / 10) - Math.floor(y / 10)) * 10 + Math.abs((x % 10) - (y % 10));
    if (given === flip) return '자리마다 큰 수에서 작은 수를 뺌';
  }
  if (Math.abs(given - correct) === 1) return '한 끗 차이 (세다가 어긋남)';
  if (Math.abs(given - correct) % 10 === 0) return '십의 자리를 잘못 셈';
  return '아직 익숙하지 않음';
}

/**
 * 세션에 넣을 문항 하나를 만든다.
 * 형태가 무엇이든 factKey 는 그대로 유지된다 — 간격 반복이 깨지지 않도록.
 */
export function makeQuestion(key, box = 0, variant = 'basic', opts = {}) {
  const { x, y, op } = dress(key, opts.plain);
  const sign = op === '+' ? '+' : '−';
  const total = op === '+' ? x + y : x - y;
  const use = VARIANTS.some((v) => v.id === variant) ? variant : 'basic';

  const tok = (t, blank) => ({ t: String(t), blank });
  const base = {
    skillId: id,
    factKey: key,
    variant: use,
    prompt: `${x} ${sign} ${y}`,
    ctx: { x, y, op, variant: use },
    hint: op === '+' ? '일의 자리부터 더해요' : '일의 자리부터 빼요',
  };

  if (use === 'missingB') {
    return { ...base, answer: y, mode: 'input',
      render: { type: 'expr', tokens: [tok(x), tok(sign), tok('?', true), tok('='), tok(total)] },
      hint: `${x}에 얼마를 ${op === '+' ? '더해야' : '빼야'} ${total}이 될까요?` };
  }
  if (use === 'missingA') {
    return { ...base, answer: x, mode: 'input',
      render: { type: 'expr', tokens: [tok('?', true), tok(sign), tok(y), tok('='), tok(total)] },
      hint: `얼마에서 시작해야 ${total}이 될까요?` };
  }
  if (use === 'truefalse') {
    const truthy = Math.random() < 0.5;
    const shown = truthy ? total : distractorsFor(x, y, op, total)[0];
    base.ctx.shown = shown;
    return { ...base, answer: truthy ? 1 : 0, mode: 'ox',
      render: { type: 'expr', ox: true, tokens: [tok(x), tok(sign), tok(y), tok('='), tok(shown)] },
      hint: '맞으면 O, 틀리면 X' };
  }

  // basic
  const mode = box <= 0 ? 'choice' : 'input';
  return { ...base, answer: total, mode,
    choices: mode === 'choice' ? shuffle([total, ...distractorsFor(x, y, op, total)]) : undefined,
    render: { type: 'expr', tokens: [tok(x), tok(sign), tok(y), tok('='), tok('?', true)] } };
}
