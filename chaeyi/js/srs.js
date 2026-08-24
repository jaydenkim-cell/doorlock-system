/**
 * Leitner 간격 반복 엔진
 *
 * 왜 처음부터 넣는가:
 *   오늘 맞힌 문제를 내일 또 내면 지루하고, 한 달 뒤에 내면 까먹는다.
 *   이 스케줄링은 진도 데이터 구조 자체를 결정하기 때문에 나중에 붙이면
 *   기록을 전부 갈아엎어야 한다.
 *
 * 승급 규칙 (곱셈구구의 목표는 "맞히기"가 아니라 "자동으로 나오기"이므로
 * 정답 여부만이 아니라 응답 속도를 함께 본다):
 *   정답 + 빠름  → box + 1
 *   정답 + 느림  → box 유지 (정답이라고 다 아는 게 아니다. 손가락으로 세는 중)
 *   오답        → box 1 로 강등 + 같은 세션 끝에 재출제
 */

const DAY = 24 * 60 * 60 * 1000;

/** box 1~5 의 복습 간격(일). box 1 은 "같은 세션 안에서 다시" 라는 뜻이다. */
export const INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 21 };
export const MAX_BOX = 5;

/** 정답이어도 이 시간을 넘기면 "느림"으로 보고 승급시키지 않는다. */
export function isFast(ms, targetMs) {
  return ms <= targetMs;
}

export function nextBox(box, correct, fast) {
  if (!correct) return 1;
  if (box <= 0) return fast ? 2 : 1;
  if (!fast) return Math.max(1, box);
  return Math.min(MAX_BOX, box + 1);
}

export function dueAtFor(box, now = Date.now()) {
  const days = INTERVAL_DAYS[box] ?? 0;
  return now + days * DAY;
}

/**
 * 한 문항의 결과를 숙련 기록에 반영한다. (state.mastery() 가 준 객체를 직접 수정)
 * @returns {{promoted:boolean, mastered:boolean, newBest:boolean}}
 */
export function applyResult(m, { correct, ms, given, reason }, targetMs, bestMs) {
  const fast = isFast(ms, targetMs);
  const before = m.box;

  m.seen += 1;
  if (correct) m.correct += 1;
  // 이동 평균. 최근 기록에 더 무게를 둬서 "요즘 빨라졌는지"가 드러나게 한다.
  m.avgMs = m.avgMs ? Math.round(m.avgMs * 0.7 + ms * 0.3) : ms;

  if (!correct) {
    m.lastWrong = given;
    m.wrongLog.unshift({ given, reason, at: Date.now() });
    m.wrongLog = m.wrongLog.slice(0, 5);
  }

  m.box = nextBox(m.box, correct, fast);
  m.dueAt = dueAtFor(m.box);

  let newBest = false;
  if (correct && bestMs) {
    const prev = bestMs[m.factKey];
    if (!prev || ms < prev) { bestMs[m.factKey] = ms; newBest = !!prev; }
  }

  return {
    promoted: m.box > before,
    mastered: isMastered(m, targetMs),
    newBest,
  };
}

/** 마스터 = 충분히 오래 기억하고 있고(box>=4) 충분히 빠르다(avgMs<=목표) */
export function isMastered(m, targetMs) {
  return m.box >= 4 && m.avgMs > 0 && m.avgMs <= targetMs;
}

/** 0~1 사이 숙련도. 홈 화면의 색칠 정도에 쓴다. */
export function masteryRatio(m, targetMs) {
  if (!m || !m.box) return 0;
  const boxPart = Math.min(m.box, MAX_BOX) / MAX_BOX;      // 기억 유지
  const speedPart = m.avgMs ? Math.min(1, targetMs / m.avgMs) : 0; // 자동화
  return Math.max(0, Math.min(1, boxPart * 0.6 + speedPart * 0.4));
}

export function isDue(m, now = Date.now()) {
  // 아직 만난 적 없는 문항은 기록 자체가 없다. 옆의 masteryRatio 와 같게 막아 둔다
  // — 연산별 집계는 안 만나 본 문항까지 훑기 때문에 undefined 가 그대로 들어온다.
  if (!m) return false;
  return m.box > 0 && m.dueAt <= now;
}
