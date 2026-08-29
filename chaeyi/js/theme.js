/**
 * 화면 톤 3단계
 *
 * 🐷 저금통, 🍓 묶어세기, "괜찮아요, 다시 해봐요", 별·스티커 —
 * 초2에게는 딱 맞지만 중2가 열면 3초 만에 닫는다. 콘텐츠가 아니라 정체성 문제라
 * 학년 값만으로는 덮이지 않는다.
 *
 * 색은 CSS 의 `[data-tone]` 토큰이 맡고, 여기서는 **문구와 이름표**를 맡는다.
 * 화면마다 문구를 흩어놓으면 톤을 한 번 더 손볼 때 전부 뒤져야 한다.
 */

import * as grades from './grades.js';

export const TONES = ['kid', 'tween', 'teen'];

const COPY = {
  kid: {
    wrongTitle: '괜찮아요, 다시 해봐요',
    wrongOk: '알겠어요',
    correct: '정답이에요!',
    mastered: '완전히 외웠어요! ⭐️',
    newBest: '최고 기록! ⚡️',
    combo: (n) => `${n}연속 정답! 🔥`,
    star: '별',
    sticker: '스티커',
    stickerBoard: '🏅 모은 스티커',
    wallet: '용돈 저금통',
    walletEmoji: '🐷',
    todayStart: '오늘의 공부 시작',
    resume: '이어서 하기 ▶︎',
    again: '한 판 더!',
    home: '홈으로',
    whoTitle: '누구야?',
    whoHint: '자기 얼굴을 눌러요',
    rallyIntro: '60초 안에 몇 개?',
    rallyNote: '틀려도 별은 안 없어져요. 마음껏 해봐요!',
    placementTitle: '어디까지 아는지 볼까요?',
    placementHint: '점수가 아니에요. 모르면 아무거나 눌러도 돼요',
    opsTitle: '어떤 걸 해볼까?',
    opsHint: '한 가지만 골라도 돼요',
    mixNote: (signs) => `${signs} 섞어서 나와요`,
    useGroups: true,
  },
  tween: {
    wrongTitle: '다시 볼까?',
    wrongOk: '확인',
    correct: '정답!',
    mastered: '이 유형 완성 ⭐️',
    newBest: '개인 최고 기록',
    combo: (n) => `${n}연속`,
    star: '포인트',
    sticker: '배지',
    stickerBoard: '🏅 모은 배지',
    wallet: '용돈',
    walletEmoji: '💰',
    todayStart: '오늘 학습 시작',
    resume: '이어서 풀기 ▶︎',
    again: '한 판 더',
    home: '홈',
    whoTitle: '누구세요?',
    whoHint: '이름을 고르세요',
    rallyIntro: '60초 스프린트',
    rallyNote: '틀려도 진도는 안 깎여요',
    placementTitle: '실력 확인',
    placementHint: '점수가 아니라 시작점을 찾는 거예요',
    opsTitle: '무엇을 연습할까?',
    opsHint: '하나만 골라도 돼요',
    mixNote: (signs) => `${signs} 섞어서 나와요`,
    useGroups: false,
  },
  teen: {
    wrongTitle: '오답',
    wrongOk: '확인',
    correct: '정답',
    mastered: '숙달',
    newBest: '최고 기록 갱신',
    combo: (n) => `${n} 연속`,
    star: 'XP',
    sticker: '기록',
    stickerBoard: '달성 기록',
    wallet: '적립금',
    walletEmoji: '◆',
    todayStart: '학습 시작',
    resume: '이어서 풀기',
    again: '다시',
    home: '홈',
    whoTitle: '사용자 선택',
    whoHint: '',
    rallyIntro: '60초 스프린트',
    rallyNote: '오답이어도 숙련도는 내려가지 않습니다',
    placementTitle: '수준 진단',
    placementHint: '시작점을 잡기 위한 것입니다',
    opsTitle: '연산 선택',
    opsHint: '하나만 골라도 됩니다',
    mixNote: (signs) => `${signs} 섞어서 출제`,
    useGroups: false,
  },
};

export function tone(grade) {
  return grades.of(grade).tone || 'kid';
}

export function copy(key, grade) {
  const t = COPY[tone(grade)] || COPY.kid;
  const v = t[key];
  return v !== undefined ? v : COPY.kid[key];
}

/**
 * CSS 토큰을 갈아끼운다.
 *
 * 문서 루트에 건다. `body` 의 배경은 `:root` 의 --bg 를 읽기 때문에,
 * #app 에만 걸면 카드 색만 바뀌고 화면 바탕은 그대로 남는다.
 */
export function apply(_root, grade) {
  document.documentElement.setAttribute('data-tone', tone(grade));
}
