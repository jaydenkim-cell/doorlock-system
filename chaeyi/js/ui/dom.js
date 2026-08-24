/** 아주 작은 DOM 헬퍼. 프레임워크 없이 화면을 조립하기 위한 것. */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/**
 * append() / replaceChildren() 에 넘길 자식 목록을 걸러 준다.
 *
 * h() 는 null 인 자식을 건너뛰지만 DOM 의 append 는 그걸 "null" 이라는
 * **글자로 그려 버린다**. 조건부 자식(`cond ? h(...) : null`)을 그대로 넘기면
 * 화면에 null 이 찍힌다 — 부모 화면에서 실제로 그러고 있었다.
 */
export const kids = (...list) =>
  list.flat().filter((k) => k !== null && k !== undefined && k !== false);

export function toast(msg, ms = 1800) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export const fmtSec = (ms) => (ms / 1000).toFixed(1) + '초';
