/**
 * 생성기 공통 유틸
 *
 * 생성기가 8개로 늘면서 shuffle·randInt 를 파일마다 복사해 두는 게 의미가 없어졌다.
 * 문항 렌더 토큰을 만드는 헬퍼도 여기 모은다.
 */

export { gcd, reduce, isReduced } from '../answer.js';

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

/** 식 토큰. blank:true 면 빈칸으로 강조해 그린다. */
export const tok = (t, blank) => ({ t: String(t), blank });

export function expr(...tokens) { return { type: 'expr', tokens }; }

/** 분수 하나를 그리는 토큰 */
export const fracTok = (num, den, blank) => ({ frac: true, num, den, blank });

/**
 * 오답 선지를 만든다. 후보를 순서대로 받아 정답·중복·무효값을 걸러낸다.
 * 정답에 가까운 것 위주로 남긴다 — 동떨어진 선지는 힌트가 된다.
 */
export function pickDistractors(candidates, correct, count = 3, { positive = true } = {}) {
  const pool = [];
  for (const v of candidates) {
    if (!Number.isFinite(v)) continue;
    if (positive && v <= 0) continue;
    if (v === correct || pool.includes(v)) continue;
    pool.push(v);
  }
  for (let d = 1; pool.length < count && d < 15; d++) {
    for (const v of [correct + d, correct - d]) {
      if (positive && v <= 0) continue;
      if (v !== correct && !pool.includes(v)) pool.push(v);
    }
  }
  const near = pool.sort((x, y) => Math.abs(x - correct) - Math.abs(y - correct))
                   .slice(0, count + 3);
  return shuffle(near).slice(0, count);
}

/** 여러 단(그룹)에서 문항 키를 학습 순서대로 펼치되 그룹 안은 섞는다 */
export function orderByGroups(groups) {
  const out = [];
  for (const g of groups) out.push(...shuffle(g.facts));
  return out;
}
