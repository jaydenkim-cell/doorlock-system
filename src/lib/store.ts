// ─────────────────────────────────────────────────────────────
// 가족 공동 상태 저장소.
//  - Supabase 가 설정돼 있으면: trip_state 테이블의 한 행(JSON 문서)을
//    구독(Realtime)·갱신 → 다른 가족 화면에 즉시 반영. (핸드오프 §5-1·2 해결)
//  - 설정이 없으면: localStorage + BroadcastChannel 로 "이 기기 저장" 모드.
//
// 상태는 단일 JSON 문서로 다룬다(가족 8명 규모엔 충분, 운영 단순).
// 모든 변경에는 by(작성자)·at(시각)을 남긴다(§6.2).
// ─────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react";
import { computeAutoSchedule, DayNo, EventState } from "./schedule";
import { TRIP } from "../data/trip";
import { supabase, TRIP_ID, isCloud } from "./supabase";

export type Stamp = { done: boolean; by: string; at: number };
export type Memo = { id: string; name: string; text: string; at: number };

export type SharedState = {
  departureTime: string;
  events: EventState[];
  bookings: Record<string, Stamp>;
  packing: Record<string, Stamp>;
  memos: Memo[];
  updatedAt: number;
  updatedBy: string;
};

export const SYNC_MODE: "cloud" | "local" = isCloud ? "cloud" : "local";

const LS_STATE = `okitrip:${TRIP_ID}:state`;
const LS_NAME = `okitrip:name`;

function initialState(): SharedState {
  return {
    departureTime: TRIP.defaultDepartureTime,
    events: computeAutoSchedule(TRIP.defaultDepartureTime),
    bookings: {},
    packing: {},
    memos: [],
    updatedAt: Date.now(),
    updatedBy: "",
  };
}

// 원격/로컬에서 불러온 부분 데이터를 안전하게 채워 넣는다(스키마 진화 대비).
function normalize(raw: Partial<SharedState> | null | undefined): SharedState {
  const base = initialState();
  if (!raw) return base;
  return {
    departureTime: raw.departureTime || base.departureTime,
    events: raw.events?.length ? raw.events : base.events,
    bookings: raw.bookings || {},
    packing: raw.packing || {},
    memos: raw.memos || [],
    updatedAt: raw.updatedAt || Date.now(),
    updatedBy: raw.updatedBy || "",
  };
}

// ── 간단한 외부 store (useSyncExternalStore 용) ──
let state: SharedState = initialState();
const listeners = new Set<() => void>();
let ready = false;

function emit() {
  for (const l of listeners) l();
}
function setState(next: SharedState) {
  state = next;
  emit();
}

export function getSnapshot(): SharedState {
  return state;
}
export function getReady(): boolean {
  return ready;
}
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ── 영속화 ──
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let bc: BroadcastChannel | null = null;

async function persist(next: SharedState) {
  if (SYNC_MODE === "cloud" && supabase) {
    await supabase.from("trip_state").upsert({
      id: TRIP_ID,
      data: next,
      updated_at: new Date(next.updatedAt).toISOString(),
    });
  } else {
    localStorage.setItem(LS_STATE, JSON.stringify(next));
    bc?.postMessage(next);
  }
}

/** 상태를 변경하고(작성자·시각 갱신) 저장한다. */
export function mutate(by: string, fn: (draft: SharedState) => void) {
  const next: SharedState = structuredClone(state);
  fn(next);
  next.updatedAt = Date.now();
  next.updatedBy = by || next.updatedBy;
  setState(next);
  if (saveTimer) clearTimeout(saveTimer);
  const snapshot = next;
  saveTimer = setTimeout(() => void persist(snapshot), 250);
}

// ── 초기화: 한 번만 ──
let started = false;
export async function initStore() {
  if (started) return;
  started = true;

  if (SYNC_MODE === "cloud" && supabase) {
    const { data } = await supabase.from("trip_state").select("data").eq("id", TRIP_ID).maybeSingle();
    setState(normalize(data?.data as Partial<SharedState> | undefined));
    if (!data) await persist(state); // 최초 행 생성

    supabase
      .channel(`trip_state:${TRIP_ID}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_state", filter: `id=eq.${TRIP_ID}` },
        (payload) => {
          const incoming = (payload.new as { data?: Partial<SharedState> })?.data;
          if (incoming) setState(normalize(incoming));
        },
      )
      .subscribe();
  } else {
    try {
      const raw = localStorage.getItem(LS_STATE);
      setState(normalize(raw ? JSON.parse(raw) : null));
    } catch {
      setState(initialState());
    }
    bc = "BroadcastChannel" in window ? new BroadcastChannel(`okitrip:${TRIP_ID}`) : null;
    bc?.addEventListener("message", (e) => setState(normalize(e.data)));
    window.addEventListener("storage", (e) => {
      if (e.key === LS_STATE && e.newValue) setState(normalize(JSON.parse(e.newValue)));
    });
  }
  ready = true;
  emit();
}

// ── 이름(호칭) ──
export function getMyName(): string {
  return localStorage.getItem(LS_NAME) || "";
}
export function setMyName(name: string) {
  localStorage.setItem(LS_NAME, name);
}

// ── React hooks ──
export function useTrip(): SharedState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function useReady(): boolean {
  return useSyncExternalStore(subscribe, getReady, getReady);
}

// ── 진행률(예약 완료 / 전체) ──
export function bookingProgress(s: SharedState, total: number): number {
  const done = Object.values(s.bookings).filter((b) => b.done).length;
  return total ? Math.round((done / total) * 100) : 0;
}

export type DayMove = { id: string; day: DayNo; startMin: number };
