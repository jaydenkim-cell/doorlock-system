/**
 * 저장소 · 프로필 · 진도 데이터
 *
 * 설계 원칙
 *  - schemaVersion 을 두고 마이그레이션 훅을 처음부터 만들어 둔다.
 *    (나중에 SRS/진단 필드를 늘려도 아이가 쌓은 기록을 버리지 않기 위해)
 *  - 프로필을 처음부터 배열로 둔다. 지금은 채이 한 명이지만 형제자매가 늘어도
 *    데이터 이사를 하지 않아도 된다.
 *  - localStorage 는 브라우저 캐시를 지우면 날아간다. 그래서 exportJSON /
 *    importJSON 을 기본 기능으로 넣는다. (부모 화면에서 백업)
 */

const KEY = 'chaei.store';
export const SCHEMA_VERSION = 3;

export const DEFAULT_SETTINGS = {
  weeklyGoalDays: 4,   // 스트릭 0 리셋 대신 "주 4일" 목표
  sessionLength: 10,   // 초2 집중력 기준 5~7분
  targetMs: 3000,      // 곱셈구구는 3초 안에 자동으로 나오는 것이 목표
                       // (난이도 프리셋이 이 값을 함께 바꾼다 — difficulty.js)
  difficulty: 'auto',  // auto | easy | normal | hard
  allowance: null,     // 용돈 설정. null 이면 allowance.js 의 기본값
  maxNewPerSession: 3, // 한 세션에 새 항목은 최대 3개
  sound: true,
  haptics: true,
  parentPin: '',       // 비어 있으면 잠금 없음
};

/** 버전별 마이그레이션. key = 올라갈 버전 번호 */
const MIGRATIONS = {
  // 난이도 레벨·랠리 기록·진단 여부가 생겼다. 기존 기록은 그대로 두고 칸만 만든다.
  2: (s) => {
    for (const d of Object.values(s.data || {})) {
      if (!d.levels) d.levels = {};
      if (!d.rally) d.rally = {};
      if (d.placementDone === undefined) {
        // 이미 몇 판 해본 아이라면 진단을 다시 시키지 않는다
        d.placementDone = (d.sessions || []).length > 0;
      }
      if (d.settings && !d.settings.difficulty) d.settings.difficulty = 'auto';
    }
    return s;
  },
  // 용돈 저금통이 생겼다. 기존 아이는 0원부터 시작한다.
  3: (s) => {
    for (const d of Object.values(s.data || {})) {
      if (!d.wallet) d.wallet = { balance: 0, lifetime: 0, ledger: [] };
    }
    return s;
  },
};

function emptyProfileData() {
  return {
    mastery: {},        // factKey -> MasteryRecord
    sessions: [],       // 완료된 세션 로그
    activeSession: null,// 진행 중 세션 (문항 단위로 저장 → 중단 복구)
    stickers: [],       // 마스터 보상
    bestMs: {},         // factKey -> 개인 최고 응답시간
    levels: {},         // skillId -> { level, recent[] }  난이도 자동 조정
    rally: {},          // skillId -> { best, last, at }   60초 랠리 기록
    placementDone: false,
    wallet: { balance: 0, lifetime: 0, ledger: [] }, // 용돈 저금통
    settings: { ...DEFAULT_SETTINGS },
  };
}

function emptyStore() {
  return {
    schemaVersion: SCHEMA_VERSION,
    profiles: [],
    activeProfileId: null,
    data: {},
  };
}

function migrate(store) {
  let v = store.schemaVersion || 1;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v + 1];
    if (!step) break;
    store = step(store);
    v += 1;
  }
  store.schemaVersion = SCHEMA_VERSION;
  return store;
}

let store = null;

export function load() {
  if (store) return store;
  try {
    const raw = localStorage.getItem(KEY);
    store = raw ? migrate(JSON.parse(raw)) : emptyStore();
  } catch (e) {
    console.warn('저장된 데이터를 읽지 못했습니다. 새로 시작합니다.', e);
    store = emptyStore();
  }
  return store;
}

export function save() {
  if (!store) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch (e) {
    // 용량 초과 등. 아이에게 오류를 보여주지 않고 조용히 넘어가되 로그는 남긴다.
    console.error('저장 실패', e);
  }
}

/**
 * id 만들기. 시각만 쓰면 같은 밀리초에 만든 둘이 같은 id 를 받아
 * 데이터 버킷을 공유해 버린다 (아이 둘 진도가 통째로 섞인다).
 * 무작위를 섞고, 그래도 겹치면 다시 뽑는다.
 */
function uid(prefix, taken = []) {
  let id;
  do {
    id = prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  } while (taken.includes(id));
  return id;
}

export function createProfile({ name, grade = 2, avatar = '🦊', color = 'grape' }) {
  const s = load();
  const id = uid('p', s.profiles.map((p) => p.id));
  s.profiles.push({ id, name, grade, avatar, color, createdAt: Date.now() });
  s.data[id] = emptyProfileData();
  s.activeProfileId = id;
  save();
  return id;
}

export function profiles() { return load().profiles; }

export function activeProfile() {
  const s = load();
  return s.profiles.find((p) => p.id === s.activeProfileId) || null;
}

export function setActiveProfile(id) {
  const s = load();
  if (s.data[id]) { s.activeProfileId = id; save(); }
}

/**
 * 프로필을 지운다. 그 아이의 진도와 **저금통 잔액까지** 사라진다.
 * 되돌릴 수 없으므로 호출하는 쪽에서 반드시 확인을 받아야 한다.
 * @returns {string|null} 지운 뒤 활성화된 프로필 id (아무도 안 남으면 null)
 */
export function deleteProfile(id) {
  const s = load();
  s.profiles = s.profiles.filter((p) => p.id !== id);
  delete s.data[id];
  if (s.activeProfileId === id) {
    s.activeProfileId = s.profiles[0]?.id || null;
  }
  save();
  return s.activeProfileId;
}

export function updateProfile(patch) {
  const p = activeProfile();
  if (!p) return;
  Object.assign(p, patch);
  save();
}

/** 현재 프로필의 학습 데이터 */
export function pdata() {
  const s = load();
  if (!s.activeProfileId) return null;
  if (!s.data[s.activeProfileId]) s.data[s.activeProfileId] = emptyProfileData();
  const d = s.data[s.activeProfileId];
  // 설정에 새 키가 추가된 경우를 대비해 기본값을 채워 넣는다.
  d.settings = { ...DEFAULT_SETTINGS, ...d.settings };
  if (!d.levels) d.levels = {};
  if (!d.rally) d.rally = {};
  if (!d.wallet) d.wallet = { balance: 0, lifetime: 0, ledger: [] };
  return d;
}

export function settings() { return pdata().settings; }

export function updateSettings(patch) {
  Object.assign(pdata().settings, patch);
  save();
}

/** factKey 하나의 숙련 기록을 가져오거나 새로 만든다 */
export function mastery(skillId, factKey) {
  const d = pdata();
  const key = `${skillId}:${factKey}`;
  if (!d.mastery[key]) {
    d.mastery[key] = {
      skillId, factKey,
      box: 0,            // 0 = 아직 만난 적 없음, 1~5 = Leitner 박스
      dueAt: 0,
      seen: 0,
      correct: 0,
      avgMs: 0,
      lastWrong: null,   // 아이가 마지막으로 적은 오답 (진단용)
      wrongLog: [],      // 최근 오답 5개 {given, reason, at}
    };
  }
  return d.mastery[key];
}

export function masteryList(skillId) {
  const d = pdata();
  return Object.values(d.mastery).filter((m) => m.skillId === skillId);
}

// ── 백업 ────────────────────────────────────────────────────────────
export function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.profiles)) {
    throw new Error('이 파일은 채이앱 백업 파일이 아닙니다.');
  }
  store = migrate(parsed);
  save();
  return store;
}

export function resetAll() {
  store = emptyStore();
  save();
}
