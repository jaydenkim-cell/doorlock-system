/**
 * 난이도 — 자동 레벨 + 부모가 고르는 프리셋
 *
 * 1차에는 난이도라는 개념이 아예 없었다. SRS 가 "무엇을" 낼지는 적응했지만
 * 문제 자체의 어려움은 절대 변하지 않아서, 몇 판만 해보면 똑같이 느껴졌다.
 *
 * 두 겹으로 나눈다.
 *   자동 레벨(1~5) : 최근 성적에 따라 오르내리며 "어떤 형태의 문제가 나올지"를 정한다.
 *   부모 프리셋     : 그 레벨이 움직일 수 있는 범위와 목표 응답시간을 가둔다.
 *
 * 레벨이 목표 응답시간까지 흔들지는 않는다. 마스터 기준이 매 판 달라지면
 * 부모 리포트의 "마스터 5단"이 무슨 뜻인지 알 수 없게 된다.
 */

import * as store from './state.js';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

/** 최근 몇 문항으로 레벨을 판단할지. 짧으면 요동치고 길면 안 따라온다. */
const WINDOW = 12;
/** 판단에 필요한 최소 표본. 이보다 적으면 레벨을 건드리지 않는다. */
const MIN_SAMPLE = 8;

export const PRESETS = {
  auto:   { label: '자동', levelMin: 1, levelMax: 5, targetMs: 3000,
            note: '아이 성적에 따라 스스로 오르내려요' },
  easy:   { label: '쉬움', levelMin: 1, levelMax: 2, targetMs: 5000,
            note: '기본 형태 위주, 시간도 넉넉하게' },
  normal: { label: '보통', levelMin: 2, levelMax: 3, targetMs: 3000,
            note: '뛰어세기·역방향까지' },
  hard:   { label: '도전', levelMin: 4, levelMax: 5, targetMs: 2500,
            note: '모든 형태, 직접 입력 위주' },
};

export const PRESET_KEYS = ['auto', 'easy', 'normal', 'hard'];

export function preset() {
  return PRESETS[store.settings().difficulty] || PRESETS.auto;
}

/** 프리셋을 바꾸면 목표 응답시간도 함께 따라간다 */
export function setPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  store.updateSettings({ difficulty: name, targetMs: p.targetMs });
  // 새 범위 밖에 있던 레벨을 즉시 끌어온다
  for (const skillId of Object.keys(store.pdata().levels || {})) {
    const rec = levelRecord(skillId);
    rec.level = clamp(rec.level);
  }
  store.save();
}

function clamp(level) {
  const p = preset();
  return Math.max(p.levelMin, Math.min(p.levelMax, level));
}

export function levelRecord(skillId) {
  const d = store.pdata();
  if (!d.levels) d.levels = {};
  if (!d.levels[skillId]) {
    d.levels[skillId] = { level: preset().levelMin, recent: [] };
  }
  return d.levels[skillId];
}

export function levelOf(skillId) {
  return clamp(levelRecord(skillId).level);
}

/**
 * 한 문항의 결과를 반영해 레벨을 다시 계산한다.
 * @returns {{level:number, changed:number}} changed 는 -1 / 0 / +1
 */
export function record(skillId, { correct, fast }) {
  const rec = levelRecord(skillId);
  const before = clamp(rec.level);

  rec.recent.push(correct ? (fast ? 2 : 1) : 0); // 2=빠른정답 1=느린정답 0=오답
  if (rec.recent.length > WINDOW) rec.recent = rec.recent.slice(-WINDOW);

  if (rec.recent.length >= MIN_SAMPLE) {
    const n = rec.recent.length;
    const acc = rec.recent.filter((v) => v > 0).length / n;
    const fastRate = rec.recent.filter((v) => v === 2).length / n;

    if (acc >= 0.9 && fastRate >= 0.6) {
      rec.level = clamp(rec.level + 1);
      rec.recent = []; // 올린 뒤에는 새 난이도에서 다시 재본다
    } else if (acc < 0.6) {
      rec.level = clamp(rec.level - 1);
      rec.recent = [];
    }
  }

  const after = clamp(rec.level);
  store.save();
  return { level: after, changed: Math.sign(after - before) };
}

/** 이 레벨에서 쓸 수 있는 형태들 (생성기가 VARIANTS 를 내려준다) */
export function unlockedVariants(gen, level) {
  return gen.VARIANTS.filter((v) => v.minLevel <= level);
}

/**
 * 낼 형태를 고른다.
 *  - 가중치 랜덤. basic 가중치가 가장 높아 익숙한 틀이 기준선으로 남는다
 *  - 직전 문항과 같은 형태는 피한다 (연속 두 번이면 다양해진 느낌이 사라진다)
 *  - 생성기가 못 쓴다고 하는 형태는 제외 (묶어세기는 곱이 크면 화면이 무너진다)
 */
export function pickVariant(gen, key, level, avoid) {
  let pool = unlockedVariants(gen, level).filter((v) => gen.canUse(v.id, key));
  if (!pool.length) return 'basic';

  const without = pool.filter((v) => v.id !== avoid);
  if (without.length) pool = without;

  const total = pool.reduce((sum, v) => sum + v.weight, 0);
  let r = Math.random() * total;
  for (const v of pool) {
    r -= v.weight;
    if (r <= 0) return v.id;
  }
  return pool[pool.length - 1].id;
}
