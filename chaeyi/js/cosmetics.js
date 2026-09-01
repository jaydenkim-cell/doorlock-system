/**
 * 꾸미기 — 캐릭터 메이커
 *
 * 알공 같은 아이 앱이 오래 가는 이유는 문제가 재미있어서가 아니라 **모으는 재미**
 * 때문이다. 오늘 푼 열 문제는 내일 기억나지 않지만, 어제 바꾼 머리색은 앱을 켤
 * 때마다 보인다. 그래서 보상을 "숫자가 올라간다"가 아니라 **화면에 남는 것**으로 만든다.
 *
 * 처음엔 이모지 동물로 만들었다가 갈아엎었다. 유튜브를 보고 자란 초2는 제페토·
 * 토카보카 수준의 캐릭터 메이커를 이미 안다. 🦊 하나 고르는 것은 그 눈높이에서
 * 유아용이다. 그래서 피부·머리·머리색·표정·옷·옷색·꾸밈·배경 여덟 갈래를
 * 따로 고르는 구조로 바꿨다 (그림은 avatar-art.js 가 SVG 로 그린다).
 *
 * 설계에서 정한 것.
 *
 * 1) **살 수 있는 것과 해내야 얻는 것을 나눈다.**
 *    전부 별로 살 수 있으면 쉬운 판을 반복하는 게 최적 전략이 된다. 왕관·불꽃
 *    머리처럼 눈에 띄는 것은 값이 아니라 **조건**으로 잠가 둔다.
 *
 * 2) **피부톤에는 값을 매기지 않는다.** 자기 얼굴을 고르는 데 돈을 내게 하는 것은
 *    이 앱이 할 일이 아니다. 여섯 톤 전부 처음부터 열려 있다.
 *
 * 3) **잠긴 것도 보여 준다.** 감추면 목표가 생기지 않는다.
 *
 * 4) **처음부터 넉넉히 갖고 시작한다.** 빈 옷장은 재미가 아니라 결핍이다.
 */

import * as store from './state.js';
import * as points from './points.js';
import * as art from './avatar-art.js';
import { CATS_OFF, has as hasArt } from './avatar-render.js';

/**
 * 꾸미기 갈래. 순서가 곧 상점 탭 순서다.
 *
 * 그림이 없는 갈래는 `avatar-render.js` 가 `CATS_OFF` 로 알려 준다 (지금은
 * 표정·눈동자 — 몸통 그림에 얼굴이 이미 그려져 있어 못 바꾼다). 목록에서
 * 지우지 않고 걸러내기만 하는 것은, 표정만 다른 몸통을 받으면 한 줄 지워
 * 바로 되살리기 위해서다.
 */
const ALL_CATS = [
  { id: 'hair',      label: '머리',   emoji: '💇' },
  { id: 'hairColor', label: '머리색', emoji: '🎨' },
  { id: 'face',      label: '표정',   emoji: '😊' },
  { id: 'eyeColor',  label: '눈동자', emoji: '👁' },
  { id: 'skin',      label: '피부',   emoji: '🧑' },
  { id: 'top',       label: '옷',     emoji: '👕' },
  { id: 'topColor',  label: '옷색',   emoji: '🌈' },
  { id: 'shoe',      label: '신발',   emoji: '👟' },
  { id: 'acc',       label: '꾸밈',   emoji: '✨' },
  { id: 'bg',        label: '배경',   emoji: '🖼' },
];

export const CATS = ALL_CATS.filter((c) => !CATS_OFF.includes(c.id));

/** 색만 있는 갈래는 상점에서 색동그라미로 보여 준다 (작은 얼굴로는 차이가 안 보인다) */
export const SWATCH_CATS = ['hairColor', 'topColor', 'bg', 'eyeColor'];

const SRC = {
  hair: art.HAIRS, hairColor: art.HAIR_COLORS, face: art.FACES,
  eyeColor: art.EYE_COLORS, skin: art.SKINS, top: art.TOPS,
  topColor: art.TOP_COLORS, shoe: art.SHOES, acc: art.ACCS, bg: art.BGS,
};

/**
 * 상점에 내놓을 물건.
 *
 * 그림이 아직 안 온 물건은 뺀다. 목록에는 남겨 두고 거르기만 하는 것은,
 * 그림이 오면 파일 한 장 넣는 것으로 바로 되살아나게 하기 위해서다.
 */
export const ITEMS = Object.entries(SRC).flatMap(([cat, list]) =>
  list.filter((it) => hasArt(cat, it.id)).map((it) => ({
    id: it.id, cat, label: it.label || it.id,
    // 색 견본으로 보여 줄 때 쓸 색. 눈동자는 위·아래 두 색이라 그라데이션으로 만든다.
    color: it.color || null,
    unlock: it.unlock || null,
    price: it.unlock ? undefined : (it.price ?? 0),
  })));

const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function item(id) { return BY_ID[id] || null; }
export function itemsIn(cat) { return ITEMS.filter((i) => i.cat === cat); }
export function label(it) { return it?.label || it?.id || ''; }

/**
 * 조건으로 잠긴 것들. `need(ctx)` 가 true 면 열린다.
 * 여섯 가지 모두 실제로 걸린 물건이 있어야 한다 — 닿을 수 없는 조건은 장식이다.
 */
const UNLOCKS = {
  crown:   { label: '단 3개 마스터', need: (c) => c.stickers >= 3 },
  trophy:  { label: '단 8개 마스터', need: (c) => c.stickers >= 8 },
  fire:    { label: '10연속 정답',   need: (c) => c.bestStreak >= 10 },
  rocket:  { label: '랠리 20개',     need: (c) => c.rallyBest >= 20 },
  rainbow: { label: '주간 목표 달성', need: (c) => c.weeks >= 1 },
  medal:   { label: '50판 완주',     need: (c) => c.sessions >= 50 },
};

export function unlockLabel(it) {
  return it?.unlock ? (UNLOCKS[it.unlock]?.label || '') : '';
}

/** 값이 0 인 것들 — 처음부터 갖고 시작한다 */
export function freeIds() {
  return ITEMS.filter((i) => i.price === 0).map((i) => i.id);
}

/**
 * 아직 옷장이 없는 아이에게 줄 시작 차림.
 *
 * 전부 기본값으로 두면 형제자매가 **똑같이 생긴 채로** 앱을 연다. 아이에게
 * 그건 "내 캐릭터" 가 아니다. 그래서 프로필 id 로 프리셋 하나를 정해 준다 —
 * 무작위가 아니라 id 에서 계산하므로 다시 열어도 같은 얼굴이 나온다.
 */
function startLook(profileId) {
  const id = String(profileId || '');
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return PRESETS[n % PRESETS.length].look;
}

function closet() {
  const d = store.pdata();
  if (!d.closet || !d.closet.worn) {
    d.closet = { owned: freeIds(), worn: { ...startLook(store.activeProfile()?.id) } };
  }
  if (!Array.isArray(d.closet.owned)) d.closet.owned = freeIds();
  return d.closet;
}

export function owned(id) { return closet().owned.includes(id); }
export function ownedIds() { return closet().owned.slice(); }

/** 지금 입고 있는 것 — 그대로 avatar-art 에 넘길 수 있는 모양이다 */
export function look() {
  return { ...art.DEFAULT_LOOK, ...closet().worn };
}

/** 다른 아이의 차림새 (읽기 전용 — 활성 프로필을 흔들지 않는다) */
export function lookOf(profileId) {
  const d = store.pdataOf(profileId);
  // 아직 옷장을 안 연 아이도 같은 규칙으로 계산해서 홈에서 본 얼굴과 맞춘다
  return { ...art.DEFAULT_LOOK, ...(d?.closet?.worn || startLook(profileId)) };
}

/** 지금 아이의 성취 상황 — 조건부 물건이 열렸는지 판정할 때 쓴다 */
export function progressCtx() {
  const d = store.pdata();
  const rallyBest = Math.max(0, ...Object.values(d.rally || {}).map((r) => r.best || 0));
  const bestStreak = Math.max(0, ...(d.sessions || []).map((s) => s.summary?.bestStreak || 0));
  // 주간 목표를 몇 번 채웠는지는 별 내역에 남아 있다
  const weeks = (d.points?.ledger || []).filter((e) => e.kind === 'weekly').length;
  return {
    stickers: (d.stickers || []).length,
    sessions: (d.sessions || []).length,
    bestStreak, rallyBest, weeks,
  };
}

export function unlockMet(it, ctx = progressCtx()) {
  if (!it.unlock) return true;
  const u = UNLOCKS[it.unlock];
  return u ? !!u.need(ctx) : false;
}

/**
 * 이 물건의 지금 상태.
 *  own    이미 가짐 (입을 수 있다)   buy  별로 살 수 있다
 *  poor   별이 모자라다              earn 조건을 채워 받을 수 있다
 *  locked 조건을 아직 못 채웠다
 */
export function stateOf(it, ctx = progressCtx()) {
  if (owned(it.id)) return 'own';
  if (it.unlock) return unlockMet(it, ctx) ? 'earn' : 'locked';
  return points.canAfford(it.price) ? 'buy' : 'poor';
}

/** 산다(또는 조건을 채운 것을 받는다) */
export function acquire(id) {
  const it = item(id);
  if (!it) return { ok: false, reason: 'NO_ITEM' };
  if (owned(id)) return { ok: true };

  if (it.unlock) {
    if (!unlockMet(it)) return { ok: false, reason: 'LOCKED' };
  } else if (!points.spend(it.price, label(it))) {
    return { ok: false, reason: 'NOT_ENOUGH' };
  }
  closet().owned.push(id);
  store.save();
  return { ok: true };
}

/** 입는다. 갖고 있지 않으면 거절한다. */
export function wear(id) {
  const it = item(id);
  if (!it || !owned(id)) return false;
  const c = closet();
  c.worn = { ...look(), [it.cat]: id };
  store.save();
  return true;
}

/** 조건을 새로 채워서 열린 것들 — 판이 끝날 때 자동으로 옷장에 넣는다 */
export function newlyUnlocked() {
  const ctx = progressCtx();
  return ITEMS.filter((it) => it.unlock && !owned(it.id) && unlockMet(it, ctx));
}

export function claimUnlocked() {
  const got = newlyUnlocked();
  if (!got.length) return [];
  const c = closet();
  for (const it of got) c.owned.push(it.id);
  store.save();
  return got;
}

export function collected() {
  return { have: closet().owned.length, all: ITEMS.length };
}

/**
 * 온보딩용 미리 만들어 둔 캐릭터들.
 *
 * 처음부터 여덟 갈래를 다 고르게 하면 초2는 이름도 못 정하고 지친다.
 * 여기서는 완성된 캐릭터 중 하나만 고르고, 세부는 나중에 꾸미기 방에서 만진다.
 */
export const PRESETS = [
  { skin: 'skin-2', hair: 'hair-long',  hairColor: 'hc-black', eyeColor: 'ec-dark',   top: 'top-dress',  topColor: 'tc-pink', shoe: 'shoe-bare' },
  { skin: 'skin-1', hair: 'hair-bob',   hairColor: 'hc-brown', eyeColor: 'ec-brown',  top: 'top-tee',    topColor: 'tc-mint', shoe: 'shoe-bare' },
  { skin: 'skin-3', hair: 'hair-curl',  hairColor: 'hc-choco', eyeColor: 'ec-brown',  top: 'top-hoodie', topColor: 'tc-sky', shoe: 'shoe-bare' },
  { skin: 'skin-2', hair: 'hair-short', hairColor: 'hc-black', eyeColor: 'ec-dark',   top: 'top-tee',    topColor: 'tc-sky', shoe: 'shoe-bare' },
  { skin: 'skin-4', hair: 'hair-pony',  hairColor: 'hc-choco', eyeColor: 'ec-brown',  top: 'top-dress',  topColor: 'tc-coral', shoe: 'shoe-bare' },
  { skin: 'skin-5', hair: 'hair-curl',  hairColor: 'hc-black', eyeColor: 'ec-dark',   top: 'top-stripe', topColor: 'tc-mint', shoe: 'shoe-bare' },
  { skin: 'skin-1', hair: 'hair-pony',  hairColor: 'hc-brown', eyeColor: 'ec-brown',  top: 'top-tee',    topColor: 'tc-coral', shoe: 'shoe-bare' },
  { skin: 'skin-3', hair: 'hair-wave',  hairColor: 'hc-black', eyeColor: 'ec-dark',   top: 'top-turtle', topColor: 'tc-mint', shoe: 'shoe-bare' },
  { skin: 'skin-6', hair: 'hair-long',   hairColor: 'hc-black', eyeColor: 'ec-dark',   top: 'top-tee',    topColor: 'tc-sun', shoe: 'shoe-bare' },
  { skin: 'skin-2', hair: 'hair-short', hairColor: 'hc-brown', eyeColor: 'ec-brown',  top: 'top-hoodie', topColor: 'tc-grape', shoe: 'shoe-bare' },
  { skin: 'skin-4', hair: 'hair-wave',  hairColor: 'hc-choco', eyeColor: 'ec-brown',  top: 'top-dress',  topColor: 'tc-sky', shoe: 'shoe-bare' },
  { skin: 'skin-1', hair: 'hair-short', hairColor: 'hc-blonde', eyeColor: 'ec-sky',   top: 'top-tee',    topColor: 'tc-grape', shoe: 'shoe-bare' },
].map((p, i) => ({ id: `preset-${i}`, look: { ...art.DEFAULT_LOOK, ...p } }));

/**
 * 온보딩에서 고른 캐릭터를 옷장에 앉힌다.
 * 값이 붙은 부위가 섞여 있으면 그것도 함께 넣어 준다 — 처음 고른 모습이
 * "사실은 못 가진 것" 이면 안 된다.
 */
export function applyPreset(look) {
  const c = closet();
  for (const id of Object.values(look)) {
    if (BY_ID[id] && !c.owned.includes(id)) c.owned.push(id);
  }
  c.worn = { ...art.DEFAULT_LOOK, ...look };
  store.save();
  return true;
}
