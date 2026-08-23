/**
 * 답 형식과 판정
 *
 * 4차까지는 답이 늘 숫자 하나였다 (`Number(given) === q.answer`).
 * 곱셈구구와 받아올림에는 충분했지만 초4 분수에서 바로 막힌다.
 * 음수·분수·소수·좌표를 받으려면 답에 타입이 있어야 한다.
 *
 * 수식 답(인수분해, 함수식)은 여기서 다루지 않는다. `(x+2)(x+3)` 과
 * `(x+3)(x+2)` 를 같다고 판정하려면 수식 파서와 동치 판정기가 필요한데
 * 그건 이 앱의 범위를 넘는다. 그런 문제는 보기 4개로 낸다.
 */

export const TYPES = ['int', 'frac', 'dec', 'pair', 'text', 'choice', 'ox'];

/** 숫자 하나를 넘기던 기존 생성기와의 하위호환 */
export function normalize(answer) {
  if (answer === null || answer === undefined) return null;
  if (typeof answer === 'number') return { type: 'int', value: answer };
  return answer;
}

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** 분수를 기약분수로. 부호는 분자로 모은다. */
export function reduce(num, den) {
  if (den === 0) return { num: 0, den: 1 };
  const sign = den < 0 ? -1 : 1;
  num *= sign; den *= sign;
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

export function isReduced(num, den) {
  const r = reduce(num, den);
  return r.num === num && r.den === den;
}

/**
 * 채점.
 * @returns {{correct:boolean, note:string|null}}
 *   note 는 "맞긴 한데 형태가 아쉬운" 경우를 구분하기 위한 것.
 *   지금은 'notReduced' 하나뿐이다 (6/8 을 3/4 로 안 줄인 경우).
 */
export function check(given, answer) {
  const a = normalize(answer);
  if (!a) return { correct: false, note: null };

  switch (a.type) {
    case 'frac': {
      const g = given || {};
      const num = Number(g.num), den = Number(g.den);
      if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
        return { correct: false, note: null };
      }
      // 값이 다르면 그냥 오답
      if (num * a.den !== a.num * den) return { correct: false, note: null };
      // 값은 같다. 기약분수를 요구하는데 안 줄였으면 따로 표시한다.
      if (a.requireReduced !== false && !isReduced(num, den)) {
        return { correct: false, note: 'notReduced' };
      }
      return { correct: true, note: null };
    }

    case 'dec': {
      const v = Number(given);
      if (!Number.isFinite(v)) return { correct: false, note: null };
      // 부동소수점 비교. 자릿수를 지정했으면 그 자리에서 맞춘다.
      const eps = a.places != null ? Math.pow(10, -a.places) / 2 : 1e-9;
      return { correct: Math.abs(v - a.value) < eps, note: null };
    }

    case 'pair': {
      const g = given || {};
      return {
        correct: Number(g.a) === a.a && Number(g.b) === a.b,
        note: null,
      };
    }

    // 수식 보기(인수분해 등). 파서를 만들지 않는 대신 보기에서 고르게 하므로
    // 문자열이 그대로 일치하는지만 본다.
    case 'text':
      return { correct: String(given) === String(a.value), note: null };

    case 'ox':
    case 'choice':
    case 'int':
    default: {
      const v = Number(given);
      return { correct: Number.isFinite(v) && v === a.value, note: null };
    }
  }
}

/** 사람이 읽는 형태. 결과 화면·부모 리포트·정답 안내에 쓴다. */
export function format(answer) {
  const a = normalize(answer);
  if (!a) return '';
  switch (a.type) {
    case 'frac': return a.den === 1 ? String(a.num) : `${a.num}/${a.den}`;
    case 'dec':  return a.places != null ? a.value.toFixed(a.places) : String(a.value);
    case 'pair': return `(${a.a}, ${a.b})`;
    case 'ox':   return a.value === 1 ? 'O' : 'X';
    case 'text': return String(a.value);
    default:     return String(a.value);
  }
}

/** 아이가 낸 답을 사람이 읽는 형태로 (오답 기록·리포트용) */
export function formatGiven(given, answer) {
  const a = normalize(answer);
  if (!a) return String(given);
  if (a.type === 'frac') return `${given?.num}/${given?.den}`;
  if (a.type === 'pair') return `(${given?.a}, ${given?.b})`;
  if (a.type === 'ox') return Number(given) === 1 ? 'O' : 'X';
  return String(given);
}

/** 이 답을 받으려면 어떤 입력 위젯이 필요한가 */
export function inputKind(answer, mode) {
  if (mode === 'choice' || mode === 'ox') return mode;
  const a = normalize(answer);
  if (a?.type === 'frac') return 'frac';
  if (a?.type === 'pair') return 'pair';
  return 'num';
}

/** 숫자패드에 어떤 키를 열어줄지 */
export function padOptions(answer) {
  const a = normalize(answer);
  return {
    negative: !!a?.allowNegative,
    decimal: a?.type === 'dec',
    maxLen: a?.maxLen || (a?.type === 'dec' ? 6 : 4),
  };
}
