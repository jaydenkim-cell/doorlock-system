/**
 * 꾸민 얼굴 하나 그리기
 *
 * 그림 자체는 avatar-art.js 가 SVG 문자열로 만든다. 여기서는 그걸 DOM 에 얹고
 * 크기·배경·클릭을 붙인다. 그리는 곳이 여러 군데(홈 머리, 누구야, 부모 화면,
 * 꾸미기 방, 온보딩)라 한 군데로 모아 둔다 — 안 그러면 모서리 둥글기를
 * 다섯 번 고쳐야 한다.
 */

import { h } from './dom.js';
import * as cosmetics from '../cosmetics.js';
import * as art from '../avatar-art.js';

/**
 * @param {object} [look] cosmetics.look() 결과. 없으면 지금 아이 것.
 * @param {object} opts { size:px, tag:'div'|'button', ...나머지는 속성으로 }
 */
export function avatar(look, { size = 46, tag = 'div', ...attrs } = {}) {
  const l = look || cosmetics.look();
  const el = h(tag, {
    ...attrs,
    class: 'av' + (attrs.class ? ' ' + attrs.class : ''),
    style: {
      width: `${size}px`, height: `${size}px`,
      // 무지개·우주 배경은 그라데이션이라 SVG 안에서 못 칠한다. 여기서 칠한다.
      background: art.bgOf(l),
      ...(attrs.style || {}),
    },
  });
  el.innerHTML = art.svgMarkup(l, { bg: false });
  return el;
}

/** 다른 아이의 얼굴 (누구야 화면·부모 화면에서 프로필별로 그린다) */
export function avatarFor(profileId, opts) {
  return avatar(cosmetics.lookOf(profileId), opts);
}
