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

/** 핵심 한 자리 계산에 십의 자리 옷을 입혀 두 자리 문제로 만든다 */
function dress(key) {
  const { a, op, b } = parseFact(key);
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

export function makeQuestion(key, box = 0) {
  const { x, y, op } = dress(key);
  const answer = op === '+' ? x + y : x - y;
  const mode = box <= 0 ? 'choice' : 'input';
  const q = {
    skillId: id,
    factKey: key,
    prompt: `${x} ${op === '+' ? '+' : '−'} ${y}`,
    answer,
    mode,
    ctx: { x, y, op },
    hint: op === '+' ? '일의 자리부터 더해요' : '일의 자리부터 빼요',
  };
  if (mode === 'choice') q.choices = shuffle([answer, ...distractorsFor(x, y, op, answer)]);
  return q;
}
