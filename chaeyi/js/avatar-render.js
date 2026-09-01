/**
 * 아바타를 무엇으로 그릴지 고르는 자리
 *
 * 오랫동안 `avatar-art.js` 가 SVG 좌표를 손으로 찍어 그렸다. 그 방식에는
 * 천장이 있어서 — 아이 눈높이에 못 미친다는 판정을 여러 번 받았다 — 결국
 * **부위별 그림 파일로 교체**했다. 종이인형 도안처럼 몸통 한 장 위에
 * 머리·옷·신발·꾸밈을 겹쳐 쌓는다.
 *
 * `avatar-art.js` 는 그대로 남는다. 이제 그림은 안 그리지만 **목록**을 갖고
 * 있기 때문이다 — 어떤 물건이 있고, 이름이 뭐고, 값이 얼마고, 무슨 조건으로
 * 열리는지. 그림과 목록은 서로 다른 관심사라 한쪽을 갈아도 다른 쪽은 남는다.
 *
 * ── 그림 한 장으로 색을 여럿 만드는 이유 ──────────────────────────
 * 머리 모양 7개 × 머리색 12개를 84장 받아 둘 수도 있었다. 그러지 않은 것은
 * 파일이 12배가 되기 때문만은 아니다. 색을 하나 더 넣고 싶을 때마다 그림을
 * 다시 받아야 하는 구조가 싫었다. `recolor.js` 가 그릴 때 색을 입힌다.
 *
 * ── 그림이 없는 갈래 ──────────────────────────────────────────────
 * 표정과 눈동자색은 **몸통 그림에 얼굴이 이미 그려져 있어서** 못 바꾼다.
 * 그림을 주문할 때 "얼굴도 그려 달라"고 한 것이 실수였는데, 표정만 다른
 * 몸통을 여러 장 받는 것이 유일한 해법이라 일단 두 갈래를 닫아 둔다.
 * `CATS_OFF` 에 적어 두면 상점에서 탭이 사라진다.
 */

import * as art from './avatar-art.js';

/** 'drawn' = 코드로 그린 SVG · 'image' = 부위별 그림 파일 */
export const MODE = 'image';

/** 아바타 그림이 아이에게 내놓을 만한가. 아니면 홈에서 꾸미기 입구를 감춘다. */
export const ART_READY = true;

/** 그림이 없어서 상점에서 감추는 갈래 (위 설명 참고) */
export const CATS_OFF = MODE === 'image' ? ['face', 'eyeColor'] : [];

/** 물건 id → 그림 파일 이름. id 는 목록이 정하고 파일 이름은 그림이 정한다. */
const FILE = {
  hair: {
    'hair-bob': 'bob', 'hair-short': 'short', 'hair-long': 'long',
    'hair-wave': 'wave', 'hair-pony': 'shag', 'hair-twin': 'twin',
    'hair-curl': 'curl',
  },
  top: {
    'top-tee': 'tee', 'top-hoodie': 'hoodie', 'top-dress': 'dress',
    'top-stripe': 'stripe', 'top-overall': 'overall', 'top-turtle': 'turtle',
    'top-hero': 'hero', 'top-uniform': 'uniform',
  },
  shoe: { 'shoe-sneak': 'sneak', 'shoe-boot': 'boot', 'shoe-mary': 'mary' },
  acc: {
    'acc-freckle': 'freckle', 'acc-glasses': 'glasses', 'acc-pin': 'pin',
    'acc-ribbon': 'ribbon', 'acc-sun': 'sun', 'acc-bag': 'bag',
  },
};

/**
 * 그림마다 **원래 칠해져 있는 색**. 색을 바꾸려면 무엇에서 출발하는지 알아야 한다.
 * 파일에서 직접 재서 적었다 (윤곽선과 흰색을 뺀 나머지 중 가장 넓은 색).
 */
const BASE = {
  body: '#fdd7b8',
  hair: {
    bob: '#674120', short: '#432e21', long: '#643d1d', wave: '#41271c',
    shag: '#5a391d', twin: '#af7bc4', curl: '#331c11',
  },
  top: {
    tee: '#7cc8e8', hoodie: '#8b55a4', dress: '#f89cba', stripe: '#c72226',
    overall: '#507898', turtle: '#328d47', hero: '#c82b2c', uniform: '#293759',
  },
};

/**
 * 부위 그림의 주소.
 *
 * 보통은 파일 경로다. 그런데 단일 HTML 빌드(Artifact 게시용)에는 딸린
 * 파일이 없어서 그림이 본문 안에 data URI 로 들어간다. 그 표가 있으면
 * 그쪽을 쓴다 — 화면 코드는 어느 쪽인지 몰라도 된다.
 */
const src = (cat, file) => {
  const path = `./assets/parts/${cat}/${file}.png`;
  const inlined = globalThis.__CHAEYI_PARTS__;
  return (inlined && inlined[path]) || path;
};

/** 그림이 필요 없는 '아무것도 안 함' 선택지 */
const EMPTY = new Set(['shoe-bare', 'acc-none']);

/**
 * 이 물건을 그릴 수 있는가.
 *
 * 목록(`avatar-art.js`)에는 있는데 그림이 아직 안 온 물건이 있다. 그대로 두면
 * 아이가 별 140개를 주고 사도 아무 일이 안 일어난다 — 그건 기능이 아니라
 * 고장이다. 그림이 올 때까지 상점에서 감춘다 (`cosmetics.js` 가 이걸 본다).
 */
export function has(cat, id) {
  if (MODE !== 'image') return true;
  if (!FILE[cat]) return true;              // 색 갈래는 그림 파일이 없다
  return EMPTY.has(id) || Boolean(FILE[cat][id]);
}

/** 겹치는 순서. 뒤로 갈수록 위에 온다. */
function layers(look) {
  const L = { ...art.DEFAULT_LOOK, ...(look || {}) };
  const out = [];

  // 몸통 — 살색만 골라 옮긴다. 검은 눈과 눈 흰자는 그대로 있어야 한다.
  const skin = art.INDEX.skin[L.skin]?.color;
  out.push({
    src: src('body', 'base'),
    tint: skin ? { mode: 'warm', from: BASE.body, to: skin } : null,
  });

  // 신발 — 색을 안 바꾼다. 켤레마다 디자인 색이 따로 있다.
  const shoe = FILE.shoe[L.shoe];
  if (shoe) out.push({ src: src('shoe', shoe) });

  // 옷 — 대표색에 가까운 픽셀만 옮긴다. 교복 조끼는 변하고 흰 셔츠는 남는다.
  const top = FILE.top[L.top];
  if (top) {
    const c = art.INDEX.topColor[L.topColor]?.color;
    out.push({
      src: src('top', top),
      tint: c ? { mode: 'near', from: BASE.top[top], to: c, tol: 95 } : null,
    });
  }

  // 머리 — 칠이 한 색뿐이라 전부 옮겨도 된다. 검은 윤곽선은 밝기가 0 이라 남는다.
  const hair = FILE.hair[L.hair];
  if (hair) {
    const c = art.INDEX.hairColor[L.hairColor]?.color;
    out.push({
      src: src('hair', hair),
      // 보라 양갈래는 리본과 별핀이 따로 칠해져 있어 통째로 옮기면 같이 물든다
      tint: c ? { mode: hair === 'twin' ? 'near' : 'ratio', from: BASE.hair[hair], to: c, tol: 110 } : null,
    });
  }

  // 꾸밈 — 제일 위. 안경은 머리카락 위에 와야 한다.
  const acc = FILE.acc[L.acc];
  if (acc) out.push({ src: src('acc', acc) });

  return out;
}

/**
 * 이 차림새를 그릴 재료를 돌려준다.
 * @returns {{kind:'svg', markup:string, bg:string}
 *          |{kind:'layers', layers:Array<{src:string,tint?:object}>, bg:string}}
 */
export function render(look) {
  if (MODE === 'image') {
    return { kind: 'layers', bg: art.bgOf(look), layers: layers(look) };
  }
  return { kind: 'svg', markup: art.svgMarkup(look, { bg: false }), bg: art.bgOf(look) };
}

/** 미리 받아 두면 좋을 그림들 (앱을 켤 때 한 번) */
export function preload() {
  return [src('body', 'base'), ...Object.values(FILE.hair).map((f) => src('hair', f)),
          ...Object.values(FILE.top).map((f) => src('top', f))];
}
