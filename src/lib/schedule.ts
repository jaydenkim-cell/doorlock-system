// ─────────────────────────────────────────────────────────────
// 일정 자동 계산 + 이동 제약 로직 (추가 요청 기능 1·2)
//
// 기능 1) 출발시간을 설정하면 도착시각부터 그 이후 일정이 자동으로 짜인다.
//         - Day1 은 "도착시각(= 출발 + 비행 2:30)"을 기준점으로,
//           각 일정의 머무는 시간(durationMin)을 누적해 시작시각을 만든다.
//         - Day2/Day3 은 각 날의 시작시각(체크아웃 등)을 기준점으로 누적.
//
// 기능 2) 일정을 직접 옮길 수 있다(시간 뒤로 / 다음날로).
//         단, "비슷한 시간대"로만 가능하고 갭이 너무 크면 막는다.
//         - 같은 날 또는 바로 앞/다음 날로만 이동 가능(±1일).
//         - 옮긴 시각이 원래 기준 시각과 ±TOLERANCE_MIN 안이어야 한다.
// ─────────────────────────────────────────────────────────────

import { BASE_PLAN, DAY_STARTS, PlanEvent, TRIP } from "../data/trip";

/** 비슷한 시간대 허용 범위(분). 이 범위를 넘는 이동은 막는다. */
export const TOLERANCE_MIN = 180; // 3시간

export type DayNo = 1 | 2 | 3;

/** "HH:MM" → 분 */
export function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 분 → "HH:MM" (24시 넘어가면 다음날로 보정해 익일 표기) */
export function minToTime(min: number): string {
  const norm = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 화면 표기용: 24시 이상이면 "익일 HH:MM" */
export function fmtTime(min: number): string {
  return (min >= 1440 ? "익일 " : "") + minToTime(min);
}

/** 머무는 시간(분) → "2시간 30분" 식 표기 */
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${m}분`;
}

/** store 에 저장되는 가변 일정 항목(시작시각·머무는 시간·소속 날짜만 가짐) */
export type EventState = {
  id: string;
  day: DayNo;
  startMin: number;
  durationMin: number;
};

/** 화면에 그릴 완성된 일정(상수 정의 + 계산된 시각 합본) */
export type ScheduledEvent = PlanEvent & {
  startMin: number;
  endMin: number;
};

/**
 * 기능 1 핵심: 출발시간으로부터 전체 일정의 시작시각을 자동 계산.
 * BASE_PLAN 의 배열 순서를 일정 순서로 보고, 각 날의 기준점부터 누적한다.
 */
export function computeAutoSchedule(departureTime: string): EventState[] {
  const arrivalMin = timeToMin(departureTime) + TRIP.flightMinutes;
  const anchors: Record<DayNo, number> = {
    1: arrivalMin,
    2: timeToMin(DAY_STARTS[2]),
    3: timeToMin(DAY_STARTS[3]),
  };

  const cursor: Record<DayNo, number> = { ...anchors };
  const out: EventState[] = [];
  for (const ev of BASE_PLAN) {
    const start = cursor[ev.day];
    out.push({ id: ev.id, day: ev.day, startMin: start, durationMin: ev.durationMin });
    cursor[ev.day] = start + ev.durationMin;
  }
  return out;
}

export type RefMap = Record<string, { day: DayNo; startMin: number }>;

/** 기준(reference) 일정: 주어진 출발시간으로 자동계산한 "원래 자리". 이동 허용 판정에 사용. */
export function buildReference(departureTime: string): RefMap {
  const ref: RefMap = {};
  for (const e of computeAutoSchedule(departureTime)) {
    ref[e.id] = { day: e.day, startMin: e.startMin };
  }
  return ref;
}

const STATIC_BY_ID: Record<string, PlanEvent> = Object.fromEntries(
  BASE_PLAN.map((e) => [e.id, e]),
);

export function isFixed(id: string): boolean {
  return !!STATIC_BY_ID[id]?.fixed;
}

export type MoveCheck = { ok: boolean; reason?: string };

/**
 * 기능 2 핵심: 일정을 targetDay/targetStartMin 으로 옮겨도 되는지 검사.
 * - 비행 등 고정(fixed) 일정은 이동 불가.
 * - 이동 가능 날짜는 원래 날짜 ±1일(같은 날·바로 다음날·바로 전날).
 * - 옮긴 시각의 "하루 중 시각"이 원래 기준 시각과 ±TOLERANCE_MIN 이내여야 한다.
 *   (예: 17:00 공연 → 19:00 이나 다음날 17:00 은 OK, 다음날 09:00 은 갭이 커서 불가)
 */
export function validateMove(
  id: string,
  refMap: RefMap,
  targetDay: DayNo,
  targetStartMin: number,
): MoveCheck {
  if (isFixed(id)) {
    return { ok: false, reason: "비행·출국 같은 고정 일정은 옮길 수 없어요." };
  }
  const ref = refMap[id];
  if (!ref) return { ok: false, reason: "알 수 없는 일정입니다." };

  const dayGap = Math.abs(targetDay - ref.day);
  if (dayGap > 1) {
    return { ok: false, reason: "바로 다음날 / 전날까지만 옮길 수 있어요." };
  }

  const refOfDay = ((ref.startMin % 1440) + 1440) % 1440;
  const tgtOfDay = ((targetStartMin % 1440) + 1440) % 1440;
  const diff = Math.abs(tgtOfDay - refOfDay);
  const banded = Math.min(diff, 1440 - diff); // 자정을 넘는 비교 보정
  if (banded > TOLERANCE_MIN) {
    return {
      ok: false,
      reason: `원래 시간대(${minToTime(ref.startMin)})와 너무 차이가 커요. ±${Math.round(
        TOLERANCE_MIN / 60,
      )}시간 안에서만 조정할 수 있어요.`,
    };
  }
  return { ok: true };
}

/** EventState[] 를 화면용 ScheduledEvent[] 로 합본 + 날짜별/시각순 정렬 */
export function buildSchedule(events: EventState[]): Record<DayNo, ScheduledEvent[]> {
  const byDay: Record<DayNo, ScheduledEvent[]> = { 1: [], 2: [], 3: [] };
  for (const e of events) {
    const stat = STATIC_BY_ID[e.id];
    if (!stat) continue;
    byDay[e.day].push({
      ...stat,
      day: e.day,
      durationMin: e.durationMin,
      startMin: e.startMin,
      endMin: e.startMin + e.durationMin,
    });
  }
  (Object.keys(byDay) as unknown as DayNo[]).forEach((d) => {
    byDay[d].sort((a, b) => a.startMin - b.startMin);
  });
  return byDay;
}

/** 날짜 라벨 (1→10/24(금) 등) */
export function dayLabel(day: DayNo): string {
  const map: Record<DayNo, string> = {
    1: "10/24 (금)",
    2: "10/25 (토)",
    3: "10/26 (일)",
  };
  return map[day];
}

export function dayTheme(day: DayNo): string {
  const map: Record<DayNo, string> = {
    1: "도착 & 휴식",
    2: "북부 하이라이트",
    3: "마무리 & 출국",
  };
  return map[day];
}
