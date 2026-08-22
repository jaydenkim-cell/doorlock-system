/**
 * 숫자패드
 *
 * 태블릿 기본 키보드는 초2에게 느리고 오타가 잦다. 그리고 4지선다만 쓰면
 * 찍어서 25%를 맞힌다. 그래서 이미 만나 본 문제는 직접 입력하게 하고,
 * 입력 도구는 손가락에 맞춘 큰 버튼으로 직접 만든다.
 */

import * as fx from '../feedback.js';

export function numpad({ onSubmit, maxLen = 3 }) {
  let value = '';
  const el = document.createElement('div');
  el.className = 'pad';

  const display = document.createElement('div');
  display.className = 'pad-display';
  display.setAttribute('aria-live', 'polite');

  const grid = document.createElement('div');
  grid.className = 'pad-grid';

  const render = () => {
    display.textContent = value || '?';
    display.classList.toggle('is-empty', !value);
    ok.disabled = !value;
  };

  const keys = ['1','2','3','4','5','6','7','8','9','del','0','ok'];
  let ok;

  for (const k of keys) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pad-key' + (k === 'ok' ? ' pad-ok' : k === 'del' ? ' pad-del' : '');
    b.textContent = k === 'del' ? '⌫' : k === 'ok' ? '확인' : k;
    b.setAttribute('aria-label', k === 'del' ? '지우기' : k === 'ok' ? '확인' : k);
    b.addEventListener('click', () => {
      if (k === 'del') { value = value.slice(0, -1); fx.tap(); }
      else if (k === 'ok') { if (value) { const v = value; value = ''; render(); onSubmit(Number(v)); } return; }
      else if (value.length < maxLen) { value += k; fx.tap(); }
      render();
    });
    if (k === 'ok') ok = b;
    grid.append(b);
  }

  const onKey = (e) => {
    if (e.key >= '0' && e.key <= '9') { if (value.length < maxLen) { value += e.key; fx.tap(); render(); } }
    else if (e.key === 'Backspace') { value = value.slice(0, -1); render(); }
    else if (e.key === 'Enter' && value) { const v = value; value = ''; render(); onSubmit(Number(v)); }
  };
  window.addEventListener('keydown', onKey);

  el.append(display, grid);
  render();

  el.destroy = () => window.removeEventListener('keydown', onKey);
  el.clear = () => { value = ''; render(); };
  return el;
}

/** 처음 만나는 문제용 보기 4개 */
export function choices({ options, onSubmit }) {
  const el = document.createElement('div');
  el.className = 'choices';
  for (const v of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.textContent = v;
    b.addEventListener('click', () => { fx.tap(); onSubmit(v); });
    el.append(b);
  }
  el.destroy = () => {};
  el.clear = () => {};
  return el;
}

/** 참·거짓 문제용 O / X 두 버튼 */
export function oxpad({ onSubmit }) {
  const el = document.createElement('div');
  el.className = 'oxpad';
  const mk = (label, value, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ox ' + cls;
    b.textContent = label;
    b.setAttribute('aria-label', value ? '맞아요' : '틀려요');
    b.addEventListener('click', () => { fx.tap(); onSubmit(value); });
    return b;
  };
  el.append(mk('O', 1, 'ox-o'), mk('X', 0, 'ox-x'));
  el.destroy = () => {};
  el.clear = () => {};
  return el;
}
