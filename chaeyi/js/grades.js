/**
 * 학년별 차이를 한 곳에 모은다 (초1~중3)
 *
 * 3차까지 `grade` 는 이름표일 뿐이었다. 이제 무엇이 열리는지, 문제를 어떻게 낼지,
 * 화면 톤이 어떤지를 전부 여기서 정한다.
 *
 * 학년 번호는 1~9. 초1~6 = 1~6, 중1~3 = 7~9.
 */

import * as store from './state.js';

const G = (n, label, o) => ({ grade: n, label, ...o });

export const GRADES = {
  1: G(1, '초1', {
    skills: ['addsub'],
    mainSkill: 'addsub',
    plainAddsub: true,          // 두 자리로 감싸지 않고 7 + 8 그대로
    defaultPreset: 'easy',
    placementSkill: 'addsub',
    tone: 'kid',
    sessionLength: 10,
    note: '받아올림·받아내림부터 해요',
  }),
  2: G(2, '초2', {
    skills: ['mul', 'addsub'],
    mainSkill: 'mul',
    plainAddsub: false,
    defaultPreset: 'auto',
    placementSkill: 'mul',
    tone: 'kid',
    sessionLength: 10,
    note: '곱셈구구가 2학기 최대 관문이에요',
  }),
  3: G(3, '초3', {
    skills: ['mul', 'addsub', 'divide'],
    mainSkill: 'mul',
    plainAddsub: false,
    defaultPreset: 'normal',
    placementSkill: 'mul',
    tone: 'kid',
    sessionLength: 10,
    note: '곱셈구구를 다지고 나눗셈으로',
  }),
  4: G(4, '초4', {
    skills: ['divide', 'fraction', 'decimal', 'mul'],
    mainSkill: 'divide',
    plainAddsub: false,
    defaultPreset: 'auto',
    placementSkill: 'divide',
    tone: 'tween',
    sessionLength: 10,
    note: '나눗셈과 분수·소수가 시작돼요',
  }),
  5: G(5, '초5', {
    skills: ['fraction', 'factors', 'decimal', 'divide'],
    mainSkill: 'fraction',
    plainAddsub: false,
    defaultPreset: 'auto',
    placementSkill: 'fraction',
    tone: 'tween',
    sessionLength: 10,
    note: '약분·통분과 분수 계산이 고비예요',
  }),
  6: G(6, '초6', {
    skills: ['fraction', 'decimal', 'factors'],
    mainSkill: 'fraction',
    plainAddsub: false,
    defaultPreset: 'normal',
    placementSkill: 'fraction',
    tone: 'tween',
    sessionLength: 10,
    note: '분수·소수 나눗셈까지',
  }),
  7: G(7, '중1', {
    skills: ['integers', 'linear', 'fraction'],
    mainSkill: 'integers',
    plainAddsub: false,
    defaultPreset: 'auto',
    placementSkill: 'integers',
    tone: 'teen',
    sessionLength: 8,           // 문제가 길어져서 판을 짧게
    note: '정수·유리수와 일차방정식',
  }),
  8: G(8, '중2', {
    skills: ['linear', 'simul', 'integers'],
    mainSkill: 'simul',
    plainAddsub: false,
    defaultPreset: 'normal',
    placementSkill: 'linear',
    tone: 'teen',
    sessionLength: 8,
    note: '연립방정식 중심',
  }),
  9: G(9, '중3', {
    skills: ['quadratic', 'simul', 'linear'],
    mainSkill: 'quadratic',
    plainAddsub: false,
    defaultPreset: 'normal',
    placementSkill: 'quadratic',
    tone: 'teen',
    sessionLength: 8,
    note: '인수분해와 이차방정식',
  }),
};

export const GRADE_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const MAX_GRADE = 9;

/** 온보딩·부모 화면에서 학년을 초등/중등으로 묶어 보여준다 */
export const GRADE_BANDS = [
  { label: '초등', keys: [1, 2, 3, 4, 5, 6] },
  { label: '중등', keys: [7, 8, 9] },
];

/** 현재 프로필의 학년 설정. 없거나 범위를 벗어나면 2학년 기준. */
export function of(grade) {
  const g = grade ?? store.activeProfile()?.grade ?? 2;
  return GRADES[g] || GRADES[2];
}

export function hasSkill(skillId, grade) {
  return of(grade).skills.includes(skillId);
}

/** 문항 생성기에 넘길 학년 옵션 */
export function questionOpts(grade) {
  const g = of(grade);
  return { plain: g.plainAddsub, grade: g.grade, tone: g.tone };
}

/** 이 학년의 한 판 문항 수 (부모가 설정으로 덮을 수 있다) */
export function sessionLength(grade) {
  return of(grade).sessionLength;
}
