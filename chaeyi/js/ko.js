/**
 * 한국어 조사 처리
 *
 * 숫자 뒤에 붙는 조사는 그 수를 읽었을 때 받침이 있는지로 갈린다.
 *   1(일)·3(삼)·6(육)·7(칠)·8(팔)·0(영/십) → 받침 있음
 *   2(이)·4(사)·5(오)·9(구)                → 받침 없음
 * 이 문장들은 아이 화면과 부모 리포트에 그대로 나가기 때문에
 * "1×1와 헷갈림", "정답은 2 이에요" 같은 어색함이 바로 눈에 띈다.
 */

const HAS_JONGSUNG = {
  0: true,  // 영 / 십 / 백 / 천
  1: true,  // 일
  2: false, // 이
  3: true,  // 삼
  4: false, // 사
  5: false, // 오
  6: true,  // 육
  7: true,  // 칠
  8: true,  // 팔
  9: false, // 구
};

export function hasJongsung(n) {
  return HAS_JONGSUNG[Number(String(n).slice(-1))] === true;
}

/** 7과 / 9와 */
export function wa(n) { return hasJongsung(n) ? '과' : '와'; }

/** 56이에요 / 2예요 */
export function iyeyo(n) { return hasJongsung(n) ? '이에요' : '예요'; }

/** 7은 / 9는 */
export function eun(n) { return hasJongsung(n) ? '은' : '는'; }

/** 7이 / 9가 */
export function i(n) { return hasJongsung(n) ? '이' : '가'; }
