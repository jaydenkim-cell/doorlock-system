/**
 * 꾸민 아이 하나 그리기
 *
 * 그림을 무엇으로 그릴지는 `avatar-render.js` 가 정한다 (코드로 그린 SVG 냐,
 * 부위별 그림 파일이냐). 여기서는 그 결과를 DOM 에 얹고 크기·배경·클릭만
 * 붙인다. 그리는 곳이 여러 군데(홈 머리, 누구야, 부모 화면, 꾸미기 방,
 * 온보딩)라 한 군데로 모아 둔다 — 안 그러면 모서리 둥글기를 다섯 번 고쳐야 한다.
 *
 * 색은 그릴 때 입힌다. 처음 보는 조합은 그림을 받아 캔버스에서 칠해야 해서
 * 한 박자 늦는데, 그때 **원래 색을 잠깐 보여 주지 않는다** — 검은 머리를
 * 고른 아이에게 갈색 머리가 한 번 번쩍이는 것보다 아무것도 없는 편이 낫다.
 * 한 번 칠한 것은 `recolor.js` 가 기억하므로 두 번째부터는 곧바로 뜬다.
 */

import { h } from './dom.js';
import * as cosmetics from '../cosmetics.js';
import * as renderer from '../avatar-render.js';
import * as recolor from '../recolor.js';

/**
 * @param {object} [look] cosmetics.look() 결과. 없으면 지금 아이 것.
 * @param {object} opts { size:px, tag:'div'|'button', ...나머지는 속성으로 }
 */
export function avatar(look, { size = 46, tag = 'div', ...attrs } = {}) {
  const l = look || cosmetics.look();
  const r = renderer.render(l);
  const el = h(tag, {
    ...attrs,
    class: 'av' + (attrs.class ? ' ' + attrs.class : ''),
    style: {
      width: `${size}px`, height: `${size}px`,
      // 무지개·우주 배경은 그라데이션이라 그림 안에서 못 칠한다. 여기서 칠한다.
      background: r.bg,
      ...(attrs.style || {}),
    },
  });

  if (r.kind === 'layers') {
    // 부위 그림을 같은 자리에 겹쳐 쌓는다. 전부 같은 캔버스라 좌표 계산이 없다.
    for (const layer of r.layers) {
      const img = h('img', { class: 'av-layer', alt: '' });
      const done = recolor.ready(layer.src, layer.tint);
      if (done) {
        img.src = done;
      } else {
        // 아직 안 칠했다 — 다 되면 그때 붙인다. 그 전까지는 빈 자리로 둔다.
        recolor.tint(layer.src, layer.tint).then((url) => { img.src = url; });
      }
      el.append(img);
    }
  } else {
    el.innerHTML = r.markup;
  }
  return el;
}

/** 다른 아이의 얼굴 (누구야 화면·부모 화면에서 프로필별로 그린다) */
export function avatarFor(profileId, opts) {
  return avatar(cosmetics.lookOf(profileId), opts);
}
