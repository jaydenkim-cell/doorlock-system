/**
 * 용돈 저금통
 *
 * 한 판 끝내면 얼마씩 쌓이고, 목표 금액을 채우면 부모 확인을 거쳐 현금으로 바꾼다.
 *
 * 설계에서 신경 쓴 것 세 가지.
 *
 * 1) **파밍 방지는 상한으로, 벌로 하지 않는다.**
 *    쉬운 판을 무한 반복하면 돈이 무한히 쌓인다. 그래서 하루 적립 판수에 상한을 둔다.
 *    반대로 "정답률 몇 % 이상이어야 적립" 같은 조건은 두지 않았다. 그러면 어려워하는
 *    아이가 덜 받게 되는데, 그건 정확히 거꾸로다.
 *
 * 2) **완주 횟수만이 아니라 실력에도 보상한다.**
 *    한 단을 마스터하면 보너스가 붙는다. 판수만 세면 대충 빨리 넘기는 게 이득이 된다.
 *
 * 3) **잔액은 실제 돈 약속이다.**
 *    localStorage 는 브라우저 청소 한 번에 사라진다. 별이 사라지는 것과 돈이 사라지는
 *    것은 무게가 다르다. 그래서 적립·지급을 전부 내역으로 남기고, 부모 화면에서
 *    백업을 권한다. 지급에는 부모 잠금 번호를 반드시 요구한다.
 */

import * as store from './state.js';

export const DEFAULTS = {
  enabled: true,        // 아이별로 켜고 끈다 (놀러 온 친구는 꺼두면 된다)
  perSession: 10,       // 한 판 완주
  dailySessionCap: 3,   // 하루에 적립되는 판수 상한 (초2에게 하루 3판이면 충분하다)
  masteryBonus: 100,    // 한 단 마스터
  weeklyBonus: 50,      // 주간 목표 달성
  rallyBonus: 20,       // 60초 랠리 최고 기록 갱신 (하루 1회)
  goal: 5000,           // 현금화 목표
};

const KINDS = {
  session: '한 판 완주',
  mastery: '단 마스터',
  weekly: '주간 목표 달성',
  rally: '랠리 최고 기록',
  payout: '현금으로 바꿈',
  adjust: '직접 조정',
};

export function config() {
  const s = store.settings();
  return { ...DEFAULTS, ...(s.allowance || {}) };
}

/** 이 아이에게 저금통을 쓰는가 */
export function enabled() { return config().enabled !== false; }

export function setConfig(patch) {
  store.updateSettings({ allowance: { ...config(), ...patch } });
}

function wallet() {
  const d = store.pdata();
  if (!d.wallet) d.wallet = { balance: 0, ledger: [], lifetime: 0 };
  return d.wallet;
}

export function balance() { return wallet().balance; }
export function lifetime() { return wallet().lifetime; }
export function ledger() { return wallet().ledger; }
export function kindLabel(k) { return KINDS[k] || k; }

export const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;

function startOfDay(t = Date.now()) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 오늘 이 종류로 몇 번 적립했는지 */
export function countToday(kind) {
  const since = startOfDay();
  return wallet().ledger.filter((e) => e.kind === kind && e.at >= since).length;
}

function add(kind, amount, note) {
  const w = wallet();
  w.balance = Math.max(0, w.balance + amount);
  if (amount > 0) w.lifetime += amount;
  w.ledger.unshift({ at: Date.now(), kind, amount, note });
  if (w.ledger.length > 200) w.ledger = w.ledger.slice(0, 200);
  store.save();
  return { kind, amount, note, balance: w.balance };
}

/**
 * 세션 결과로 쌓이는 용돈을 계산해서 적립한다.
 * @returns {Array<{kind:string, amount:number, note:string}>} 결과 화면에 보여줄 항목들
 */
export function awardForSession(summary, { weeklyGoalMet = false } = {}) {
  if (!enabled()) return [];
  const c = config();
  const got = [];

  if (countToday('session') < c.dailySessionCap) {
    got.push(add('session', c.perSession, '한 판 완주'));
  }

  for (const label of summary.newStickers || []) {
    got.push(add('mastery', c.masteryBonus, `${label} 마스터`));
  }

  // 주간 목표는 그 주에 한 번만
  if (weeklyGoalMet && !earnedThisWeek('weekly')) {
    got.push(add('weekly', c.weeklyBonus, '이번 주 목표 달성'));
  }
  return got;
}

export function awardForRally() {
  if (!enabled()) return null;
  const c = config();
  if (countToday('rally') >= 1) return null;
  return add('rally', c.rallyBonus, '60초 랠리 최고 기록');
}

function earnedThisWeek(kind) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // 월요일
  return wallet().ledger.some((e) => e.kind === kind && e.at >= d.getTime());
}

/** 목표까지 남은 비율 0~1 */
export function progress() {
  const c = config();
  return c.goal ? Math.min(1, balance() / c.goal) : 0;
}

export function reachedGoal() { return balance() >= config().goal; }

/**
 * 지금 설정이면 목표까지 몇 주쯤 걸리는지.
 * 사용자가 정한 금액을 말없이 바꾸지 않는 대신, 속도를 눈에 보이게 한다.
 * (10원 × 하루 3판이면 5,000원까지 반년이 넘는다 — 초2에게는 너무 멀다)
 */
export function weeksToGoal() {
  const c = config();
  const days = store.settings().weeklyGoalDays || 4;
  const perWeek = c.perSession * c.dailySessionCap * days + c.weeklyBonus;
  if (perWeek <= 0) return Infinity;
  return Math.ceil(Math.max(0, c.goal - balance()) / perWeek);
}

/**
 * 현금으로 지급. 부모 잠금 번호가 설정되어 있어야만 가능하다.
 * @returns {{ok:boolean, reason?:string, balance?:number}}
 */
export function payout(amount, note = '') {
  const pin = store.settings().parentPin;
  if (!pin) return { ok: false, reason: 'PIN_REQUIRED' };
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, reason: 'BAD_AMOUNT' };
  if (amt > balance()) return { ok: false, reason: 'INSUFFICIENT' };
  add('payout', -amt, note || '현금으로 바꿈');
  return { ok: true, balance: balance() };
}

/** 부모가 잔액을 직접 고칠 때 (기기 바꿈, 오적립 정정 등) */
export function adjust(amount, note = '직접 조정') {
  return add('adjust', Math.round(Number(amount)), note);
}
