/**
 * ⭐ 별 — 앱 안에서 쓰는 포인트
 *
 * **저금통(원)과 절대 섞지 않는다.** 이게 이 파일에서 가장 중요한 규칙이다.
 *
 *   🐷 저금통 = 실제 돈. 부모가 현금으로 준다. 앱 안에서 쓸 수 없다.
 *   ⭐ 별     = 꾸미기 전용. 현금으로 바꿀 수 없다.
 *
 * 하나로 합치면 아이는 "모자 하나 = 500원" 을 배운다. 그러면 저금통에 적힌
 * 숫자가 진짜 약속이 아니라 게임 재화가 되고, 5,000원을 채워 현금을 받는
 * 경험의 무게가 사라진다. 통로를 아예 만들지 않는 편이 안전하다.
 *
 * 파밍 방지는 저금통과 같은 방식으로 — **벌이 아니라 상한**으로 한다.
 * 다만 별은 실제 돈이 아니라서 상한을 넉넉하게 둔다. 더 풀고 싶어하는 아이를
 * "오늘은 그만" 으로 막는 것은 학습 앱이 할 일이 아니다.
 */

import * as store from './state.js';

export const RULES = {
  session: 10,          // 한 판 완주
  dailySessionCap: 6,   // 하루에 별이 붙는 판수 (저금통은 3판, 별은 넉넉히)
  mastery: 30,          // 문항 하나를 완전히 외움
  combo: 10,            // 이 판 최고 콤보 5 이상
  perfect: 15,          // 한 문제도 안 틀림
  rallyBest: 15,        // 60초 랠리 최고 기록 갱신
  weekly: 50,           // 주간 목표 달성
  questAll: 40,         // 오늘의 미션 3개 전부
};

const KINDS = {
  session: '한 판 완주',
  mastery: '완전히 외움',
  combo: '연속 정답',
  perfect: '다 맞음',
  rallyBest: '랠리 최고 기록',
  weekly: '주간 목표',
  questAll: '오늘의 미션 완료',
  buy: '꾸미기 아이템',
  welcome: '그동안 모은 별',
  adjust: '부모님이 조정',
};

export function kindLabel(k) { return KINDS[k] || k; }

/** 별은 개수라서 "원" 처럼 반올림하지 않는다 */
export const star = (n) => `⭐ ${Math.round(n).toLocaleString('ko-KR')}`;

function bank() {
  const d = store.pdata();
  if (!d.points) d.points = { balance: 0, lifetime: 0, ledger: [] };
  return d.points;
}

export function balance() { return bank().balance; }
export function lifetime() { return bank().lifetime; }
export function ledger() { return bank().ledger; }

function startOfDay(t = Date.now()) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 오늘 별이 붙은 판수 (상한 계산용) */
function todaySessionCount() {
  const since = startOfDay();
  return bank().ledger.filter((e) => e.kind === 'session' && e.at >= since).length;
}

function add(kind, amount, note) {
  const b = bank();
  b.balance += amount;
  if (amount > 0) b.lifetime += amount;
  b.ledger.unshift({ kind, amount, note, at: Date.now() });
  if (b.ledger.length > 200) b.ledger.length = 200;
  return { kind, amount, note: note || kindLabel(kind) };
}

/** 부모 화면·미션 등에서 바로 지급 */
export function award(kind, amount, note) {
  const got = add(kind, amount, note);
  store.save();
  return got;
}

/**
 * 한 판이 끝났을 때 붙는 별을 한 번에 계산한다.
 * @returns {Array<{kind,amount,note}>} 아이에게 보여줄 목록
 */
export function awardForSession(summary, { weeklyGoalMet = false } = {}) {
  const got = [];
  if (todaySessionCount() < RULES.dailySessionCap) {
    got.push(add('session', RULES.session));
  }
  for (const m of summary.mastered || []) {
    got.push(add('mastery', RULES.mastery, '완전히 외움'));
  }
  if ((summary.bestStreak || 0) >= 5) {
    got.push(add('combo', RULES.combo, `${summary.bestStreak}연속`));
  }
  if (summary.total > 0 && summary.correct === summary.total) {
    got.push(add('perfect', RULES.perfect));
  }
  if (weeklyGoalMet && !gotThisWeek('weekly')) {
    got.push(add('weekly', RULES.weekly));
  }
  store.save();
  return got;
}

export function awardForRally() {
  if (gotToday('rallyBest')) return null;
  const got = add('rallyBest', RULES.rallyBest);
  store.save();
  return got;
}

function gotToday(kind) {
  const since = startOfDay();
  return bank().ledger.some((e) => e.kind === kind && e.at >= since);
}

function gotThisWeek(kind) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // 월요일
  return bank().ledger.some((e) => e.kind === kind && e.at >= d.getTime());
}

/**
 * 별을 쓴다. 모자란 채로 사면 안 되므로 반드시 반환값을 확인할 것.
 * @returns {boolean} 샀으면 true
 */
export function spend(amount, note) {
  if (amount > balance()) return false;
  add('buy', -amount, note);
  store.save();
  return true;
}

export function canAfford(amount) { return amount <= balance(); }

/** 오늘 별이 몇 판까지 붙는지 (홈에서 안내) */
export function sessionsLeftToday() {
  return Math.max(0, RULES.dailySessionCap - todaySessionCount());
}
