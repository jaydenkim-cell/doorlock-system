/**
 * 곱셈구구 (2단~9단) 문항 생성기
 *
 * 콘텐츠 고갈이 이런 앱을 죽인다. 그래서 문제를 파일에 적어두지 않고
 * 규칙으로 만들어 낸다. 곱셈구구는 사실 72개로 유한하지만, 보기(오답 선지)와
 * 출제 순서가 매번 달라지므로 아이에게는 같은 화면이 반복되지 않는다.
 *
 * 오답 선지는 무작위로 뽑지 않는다. 실제로 아이들이 헷갈리는 패턴으로 만들어야
 * "무엇을 틀렸는가"가 곧 진단 데이터가 된다.
 */

import { wa } from '../ko.js';
export { wa };

export const id = 'mul';
export const title = '곱셈구구';
export const emoji = '✖️';

const MIN_TABLE = 2;
const MAX_TABLE = 9;

export function parseFact(key) {
  const [a, b] = key.split('x').map(Number);
  return { a, b };
}

export function factKeyOf(a, b) { return `${a}x${b}`; }

export function answerOf(key) {
  const { a, b } = parseFact(key);
  return a * b;
}

/** 2단~9단 × 1~9 = 72문항 */
export function allFacts() {
  const out = [];
  for (let a = MIN_TABLE; a <= MAX_TABLE; a++) {
    for (let b = 1; b <= 9; b++) out.push(factKeyOf(a, b));
  }
  return out;
}

/** 단(段) 단위로 묶어서 홈 화면 "구구단 지도"에 쓴다 */
export function groups() {
  const out = [];
  for (let a = MIN_TABLE; a <= MAX_TABLE; a++) {
    out.push({
      id: `${a}dan`,
      label: `${a}단`,
      facts: Array.from({ length: 9 }, (_, i) => factKeyOf(a, i + 1)),
    });
  }
  return out;
}

function digitSwap(n) {
  const s = String(n);
  if (s.length !== 2 || s[0] === s[1]) return null;
  const swapped = Number(s[1] + s[0]);
  return swapped === n ? null : swapped;
}

/**
 * 실제 혼동 패턴에서 오답 선지를 만든다.
 *  - 인접한 곱   : 7×8 을 7×7 / 7×9 로 센 경우 (구구단을 외다가 한 칸 밀림)
 *  - 반대쪽 인접 : 6×8 / 8×8
 *  - 자릿수 뒤집기: 56 → 65
 *  - 덧셈 오적용  : 7+8 = 15
 */
export function distractors(key, count = 3) {
  const { a, b } = parseFact(key);
  const correct = a * b;
  const pool = [];
  const push = (v) => {
    if (Number.isInteger(v) && v > 0 && v !== correct && !pool.includes(v)) pool.push(v);
  };

  push(a * (b - 1));
  push(a * (b + 1));
  push((a - 1) * b);
  push((a + 1) * b);
  push(digitSwap(correct));
  push(a + b);
  push(correct + a);
  push(correct - b);

  // 그래도 모자라면 근처 값으로 채운다
  for (let d = 1; pool.length < count && d < 12; d++) { push(correct + d); push(correct - d); }

  // 정답에 가까운 것 위주로 섞어서 고르기 (너무 동떨어진 선지는 힌트가 된다)
  const sorted = pool.sort((x, y) => Math.abs(x - correct) - Math.abs(y - correct));
  const near = sorted.slice(0, Math.min(sorted.length, count + 3));
  return shuffle(near).slice(0, count);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 아이가 적은 오답이 어떤 종류의 실수인지 이름을 붙인다.
 * 부모 리포트에서 "7×8을 세 번 틀림"이 아니라
 * "7×8을 7×7과 헷갈림"으로 보여주기 위한 것.
 */
export function diagnose(key, given) {
  const { a, b } = parseFact(key);
  const correct = a * b;
  if (given === correct) return null;
  if (given === a + b) return '곱셈 자리에 덧셈을 함';
  if (given === a * (b - 1)) return `${a}×${b - 1}${wa(b - 1)} 헷갈림 (한 칸 앞)`;
  if (given === a * (b + 1)) return `${a}×${b + 1}${wa(b + 1)} 헷갈림 (한 칸 뒤)`;
  if (given === (a - 1) * b) return `${a - 1}×${b}${wa(b)} 헷갈림`;
  if (given === (a + 1) * b) return `${a + 1}×${b}${wa(b)} 헷갈림`;
  if (digitSwap(correct) === given) return '숫자 순서를 뒤집어 씀';

  // 다른 구구단의 답인가?
  for (let p = MIN_TABLE; p <= MAX_TABLE; p++) {
    for (let q = 1; q <= 9; q++) {
      if (p * q !== given) continue;
      if (p === a || q === a || p === b || q === b) return `${p}×${q}${wa(q)} 헷갈림`;
    }
  }
  if (Math.abs(given - correct) <= 2) return '거의 맞음 (조금 어긋남)';
  return '아직 외우지 못함';
}

/**
 * 세션에 넣을 문항 하나를 만든다.
 * 처음 만나는 문제(box 0)는 보기에서 고르게 해서 진입 장벽을 낮추고,
 * 한 번이라도 만난 문제는 직접 입력하게 해서 찍기를 막는다.
 */
export function makeQuestion(key, box = 0) {
  const { a, b } = parseFact(key);
  const answer = a * b;
  const mode = box <= 0 ? 'choice' : 'input';
  const q = {
    skillId: id,
    factKey: key,
    prompt: `${a} × ${b}`,
    answer,
    mode,
    hint: `${a}개씩 ${b}묶음`,
  };
  if (mode === 'choice') {
    q.choices = shuffle([answer, ...distractors(key, 3)]);
  }
  return q;
}
