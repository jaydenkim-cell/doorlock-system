/**
 * 학년별 차이를 한 곳에 모은다
 *
 * 3차까지 `grade` 는 이름표일 뿐이었다. 온보딩에서 2로 고정되고 홈에 글자로만
 * 보였을 뿐 콘텐츠에 아무 영향이 없었다. 조카·친구가 같이 쓰려면 실제로 달라져야 한다.
 *
 * 초4 이상은 넣지 않는다. 나눗셈·분수 생성기가 없어서 곱셈구구를 아는 아이에게는
 * 금방 지루해진다. 전 학년을 어중간하게 덮느니 초1~3을 제대로 하는 편이 낫다.
 */

import * as store from './state.js';

export const GRADES = {
  1: {
    label: '1학년',
    skills: ['addsub'],        // 곱셈구구는 아직 안 배웠다
    mainSkill: 'addsub',
    plainAddsub: true,         // 두 자리로 감싸지 않고 7 + 8 그대로
    defaultPreset: 'easy',
    placementSkill: 'addsub',
    note: '받아올림·받아내림부터 해요',
  },
  2: {
    label: '2학년',
    skills: ['mul', 'addsub'],
    mainSkill: 'mul',
    plainAddsub: false,        // 37 + 48 처럼 두 자리로
    defaultPreset: 'auto',
    placementSkill: 'mul',
    note: '곱셈구구가 2학기 최대 관문이에요',
  },
  3: {
    label: '3학년',
    skills: ['mul', 'addsub'],
    mainSkill: 'mul',
    plainAddsub: false,
    defaultPreset: 'normal',
    placementSkill: 'mul',
    note: '곱셈구구를 빠르게 다지는 데 좋아요',
  },
};

export const GRADE_KEYS = [1, 2, 3];
export const MAX_GRADE = 3;

/** 현재 프로필의 학년 설정. 프로필이 없거나 범위를 벗어나면 2학년 기준. */
export function of(grade) {
  const g = grade ?? store.activeProfile()?.grade ?? 2;
  return GRADES[g] || GRADES[2];
}

/** 이 학년에서 열려 있는 스킬인가 */
export function hasSkill(skillId, grade) {
  return of(grade).skills.includes(skillId);
}

/** 문항 생성기에 넘길 학년 옵션 */
export function questionOpts(grade) {
  return { plain: of(grade).plainAddsub };
}
