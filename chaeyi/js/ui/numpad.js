/**
 * 숫자패드
 *
 * 태블릿 기본 키보드는 초2에게 느리고 오타가 잦다. 그리고 4지선다만 쓰면
 * 찍어서 25%를 맞힌다. 그래서 이미 만나 본 문제는 직접 입력하게 하고,
 * 입력 도구는 손가락에 맞춘 큰 버튼으로 직접 만든다.
 */

import * as fx from '../feedback.js';

export function numpad({ onSubmit, maxLen = 3, negative = false, decimal = false }) {
  let value = '';
  const el = document.createElement('div');
  el.className = 'pad';

  const display = document.createElement('div');
  display.className = 'pad-display';
  display.setAttribute('aria-live', 'polite');

  const grid = document.createElement('div');
  grid.className = 'pad-grid';

  // '-' 나 '0.' 만 있는 상태는 아직 답이 아니다
  const valid = () => value !== '' && value !== '-' && Number.isFinite(Number(value));
  const render = () => {
    display.textContent = value || '?';
    display.classList.toggle('is-empty', !value);
    ok.disabled = !valid();
  };

  // 정수만 받을 때는 예전과 똑같은 배열을 쓴다 (초1~3 화면이 바뀌면 안 된다).
  // 음수·소수가 필요할 때만 키를 늘린다.
  const extra = negative && decimal ? ['±', '.'] : negative ? ['±'] : decimal ? ['.'] : [];
  const keys = extra.length
    ? ['1','2','3','4','5','6','7','8','9', ...extra, '0','del','ok']
    : ['1','2','3','4','5','6','7','8','9','del','0','ok'];
  let ok;

  for (const k of keys) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pad-key' + (k === 'ok' ? ' pad-ok' : k === 'del' ? ' pad-del' : '');
    b.textContent = k === 'del' ? '⌫' : k === 'ok' ? '확인' : k;
    b.setAttribute('aria-label', k === 'del' ? '지우기' : k === 'ok' ? '확인' : k === '±' ? '부호' : k);
    b.addEventListener('click', () => {
      if (k === 'del') { value = value.slice(0, -1); fx.tap(); }
      else if (k === 'ok') { if (valid()) { const v = value; value = ''; render(); onSubmit(Number(v)); } return; }
      else if (k === '±') { value = value.startsWith('-') ? value.slice(1) : '-' + value; fx.tap(); }
      else if (k === '.') { if (!value.includes('.') && value.length < maxLen) { value += value ? '.' : '0.'; fx.tap(); } }
      else if (value.length < maxLen) { value += k; fx.tap(); }
      render();
    });
    if (k === 'ok') ok = b;
    grid.append(b);
  }

  const onKey = (e) => {
    if (e.key >= '0' && e.key <= '9') { if (value.length < maxLen) { value += e.key; fx.tap(); render(); } }
    else if (e.key === '-' && negative) { value = value.startsWith('-') ? value.slice(1) : '-' + value; render(); }
    else if (e.key === '.' && decimal && !value.includes('.')) { value += value ? '.' : '0.'; render(); }
    else if (e.key === 'Backspace') { value = value.slice(0, -1); render(); }
    else if (e.key === 'Enter' && valid()) { const v = value; value = ''; render(); onSubmit(Number(v)); }
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

/**
 * 두 칸짜리 입력. 분수(분자/분모)와 좌표((x, y))가 같은 구조라 하나로 만든다.
 * 칸을 눌러 옮기고, 숫자패드 하나를 공유한다 — 작은 화면에 패드를 둘 두면 못 쓴다.
 */
function twoSlot({ onSubmit, layout, labels, negative = false, maxLen = 3, toValue }) {
  let slot = 0;
  const vals = ['', ''];
  const el = document.createElement('div');
  el.className = 'pad';

  const box = document.createElement('div');
  box.className = layout === 'frac' ? 'twoslot frac' : 'twoslot pair';

  const cells = [0, 1].map((i) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'slot';
    c.setAttribute('aria-label', labels[i]);
    c.addEventListener('click', () => { slot = i; fx.tap(); render(); });
    return c;
  });

  if (layout === 'frac') {
    const bar = document.createElement('div');
    bar.className = 'slot-bar';
    box.append(cells[0], bar, cells[1]);
  } else {
    const open = document.createElement('span'); open.className = 'slot-fix'; open.textContent = '(';
    const comma = document.createElement('span'); comma.className = 'slot-fix'; comma.textContent = ',';
    const close = document.createElement('span'); close.className = 'slot-fix'; close.textContent = ')';
    box.append(open, cells[0], comma, cells[1], close);
  }

  const grid = document.createElement('div');
  grid.className = 'pad-grid';
  let ok;

  const valid = () => vals.every((v) => v !== '' && v !== '-' && Number.isFinite(Number(v)));
  const render = () => {
    cells.forEach((c, i) => {
      c.textContent = vals[i] || '?';
      c.classList.toggle('on', i === slot);
      c.classList.toggle('is-empty', !vals[i]);
    });
    ok.disabled = !valid();
  };

  const extra = negative ? ['±'] : [];
  const keys = extra.length
    ? ['1','2','3','4','5','6','7','8','9', ...extra, '0','del','ok']
    : ['1','2','3','4','5','6','7','8','9','del','0','ok'];

  for (const k of keys) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pad-key' + (k === 'ok' ? ' pad-ok' : k === 'del' ? ' pad-del' : '');
    b.textContent = k === 'del' ? '⌫' : k === 'ok' ? '확인' : k;
    b.setAttribute('aria-label', k === 'del' ? '지우기' : k === 'ok' ? '확인' : k === '±' ? '부호' : k);
    b.addEventListener('click', () => {
      if (k === 'del') { vals[slot] = vals[slot].slice(0, -1); fx.tap(); }
      else if (k === 'ok') { if (valid()) onSubmit(toValue(vals)); return; }
      else if (k === '±') {
        vals[slot] = vals[slot].startsWith('-') ? vals[slot].slice(1) : '-' + vals[slot];
        fx.tap();
      } else if (vals[slot].length < maxLen) {
        vals[slot] += k; fx.tap();
        // 첫 칸을 채우면 자동으로 다음 칸으로 — 손이 덜 간다
        if (slot === 0 && vals[0].replace('-', '').length >= 2) slot = 1;
      }
      render();
    });
    if (k === 'ok') ok = b;
    grid.append(b);
  }

  el.append(box, grid);
  render();
  el.destroy = () => {};
  el.clear = () => { vals[0] = ''; vals[1] = ''; slot = 0; render(); };
  return el;
}

/** 분수 입력 (분자 / 분모) */
export function fracpad({ onSubmit, negative = false }) {
  return twoSlot({
    onSubmit, layout: 'frac', labels: ['분자', '분모'], negative, maxLen: 3,
    toValue: (v) => ({ num: Number(v[0]), den: Number(v[1]) }),
  });
}

/** 좌표 입력 ( x , y ) */
export function pairpad({ onSubmit, negative = true }) {
  return twoSlot({
    onSubmit, layout: 'pair', labels: ['x 값', 'y 값'], negative, maxLen: 3,
    toValue: (v) => ({ a: Number(v[0]), b: Number(v[1]) }),
  });
}
