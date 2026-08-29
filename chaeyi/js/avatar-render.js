/**
 * 아바타를 무엇으로 그릴지 고르는 자리
 *
 * 지금은 `avatar-art.js` 가 SVG 좌표를 직접 찍어 그린다. 그런데 손으로 곡선을
 * 더듬는 방식에는 천장이 있어서, 그림은 결국 **일러스트 파일로 교체될 예정**이다.
 * (종이인형 도안처럼 부위별 이미지가 나뉜 세트)
 *
 * 그때 화면들을 다시 손대지 않도록 여기서 한 겹 끊어 둔다. 화면은 `render(look)`
 * 만 부르고, 그림이 코드인지 이미지인지는 이 파일만 안다.
 *
 * ── 이미지 세트를 붙일 때 ──────────────────────────────────────────
 * `assets/parts/<갈래>/<id>.png` 로 넣고 `MODE = 'image'` 로 바꾸면 된다.
 * 부위 이미지는 **전부 같은 정사각 캔버스에 그려져 있어야** 한다. 다리 이미지가
 * 다리 부분만 잘려 있으면 위치를 맞출 방법이 없다 — 잘려서 오면 먼저
 * 같은 캔버스에 얹어 다시 저장해야 한다.
 */

import * as art from './avatar-art.js';

/** 'drawn' = 코드로 그린 SVG · 'image' = 부위별 이미지 파일 */
export const MODE = 'drawn';

/** 이미지 모드에서 겹치는 순서. 뒤로 갈수록 위에 온다. */
const LAYERS = ['bg', 'hairBack', 'body', 'shoe', 'top', 'face', 'hairFront', 'acc'];

const partSrc = (cat, id) => `./assets/parts/${cat}/${id}.png`;

/**
 * 이 차림새를 그릴 재료를 돌려준다.
 * @returns {{kind:'svg', markup:string, bg:string}
 *          |{kind:'layers', srcs:string[], bg:string}}
 */
export function render(look) {
  if (MODE === 'image') {
    return {
      kind: 'layers',
      bg: art.bgOf(look),
      srcs: LAYERS.filter((c) => look[c]).map((c) => partSrc(c, look[c])),
    };
  }
  return { kind: 'svg', markup: art.svgMarkup(look, { bg: false }), bg: art.bgOf(look) };
}
