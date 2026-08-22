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
export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS = {
  weeklyGoalDays: 4,   // 스트릭 0 리셋 대신 "주 4일" 목표
  sessionLength: 10,   // 초2 집중력 기준 5~7분
  targetMs: 3000,      // 곱셈구구는 3초 안에 자동으로 나오는 것이 목표
  maxNewPerSession: 3, // 한 세션에 새 항목은 최대 3개
  sound: true,
  haptics: true,
  parentPin: '',       // 비어 있으면 잠금 없음
};

/** 버전별 마이그레이션. key = 올라갈 버전 번호 */
const MIGRATIONS = {
  // 2: (store) => { ...; return store; },
};

function emptyProfileData() {
  return {
    mastery: {},        // factKey -> MasteryRecord
    sessions: [],       // 완료된 세션 로그
    activeSession: null,// 진행 중 세션 (문항 단위로 저장 → 중단 복구)
    stickers: [],       // 마스터 보상
    bestMs: {},         // factKey -> 개인 최고 응답시간
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

export function createProfile({ name, grade = 2, avatar = '🦊', color = 'grape' }) {
  const s = load();
  const id = 'p' + Date.now().toString(36);
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
