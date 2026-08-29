/**
 * 꾸미기 방
 *
 * 아이가 별을 쓰는 유일한 곳이자, 앱에서 유일하게 **공부가 아닌 화면**이다.
 * 그래서 여기만은 목표도 진도도 안 보여 준다. 고르고 입어 보는 것만 한다.
 *
 * 화면 구성에서 신경 쓴 것.
 *  - 미리보기를 맨 위에 크게 둔다. 누를 때마다 바로 바뀌어야 고르는 재미가 산다.
 *  - 잠긴 물건은 감추지 않고 실루엣으로 남긴다. 그게 다음에 할 이유가 된다.
 *  - 못 사는 물건을 눌러도 혼내지 않는다. 얼마가 모자란지만 알려 준다.
 */

import { h, toast } from '../dom.js';
import * as store from '../../state.js';
import * as points from '../../points.js';
import * as cosmetics from '../../cosmetics.js';
import * as fx from '../../feedback.js';
import { avatar } from '../avatar.js';

export function shop(go) {
  let cat = 'hair';

  const preview = h('div', { class: 'shop-preview' });
  const balanceEl = h('div', { class: 'shop-star' });
  const tabRow = h('div', { class: 'shop-tabs' });
  const grid = h('div', { class: 'shop-grid' });
  const countEl = h('div', { class: 'muted' });

  function paintPreview() {
    preview.replaceChildren(avatar(null, { size: 148 }));
    balanceEl.replaceChildren(
      h('b', {}, points.star(points.balance())),
      h('span', { class: 'muted' }, ' 있어요'),
    );
    const c = cosmetics.collected();
    countEl.textContent = `모은 것 ${c.have} / ${c.all}`;
  }

  function paintTabs() {
    tabRow.replaceChildren(...cosmetics.CATS.map((c) => h('button', {
      class: 'shop-tab' + (c.id === cat ? ' on' : ''),
      onclick: () => { cat = c.id; fx.tap(); paintTabs(); paintGrid(); },
    }, h('span', {}, c.emoji), h('b', {}, c.label))));
  }

  /**
   * 물건 하나를 어떻게 보여 줄지.
   *
   * 머리·표정·옷처럼 모양이 바뀌는 것은 **그 부위만 바꾼 얼굴**을 작게 그린다.
   * 목록에서 이름만 읽고 고르게 하면 초2는 못 고른다 — 보고 골라야 한다.
   * 색만 바뀌는 것(머리색·눈동자·옷색·배경)은 작은 얼굴로는 차이가 안 보여서
   * 색동그라미로 보여 준다.
   */
  function itemFace(it) {
    if (cosmetics.SWATCH_CATS.includes(it.cat)) {
      return h('div', { class: 'shop-swatch', style: { background: it.color } });
    }
    return avatar({ ...cosmetics.look(), [it.cat]: it.id }, { size: 54 });
  }

  function tile(it, state) {
    const wornNow = cosmetics.look()[it.cat] === it.id;
    const locked = state === 'locked';

    const body = locked
      ? h('div', { class: 'shop-locked' }, '?')
      : itemFace(it);

    const foot = state === 'own'
      ? h('div', { class: 'shop-foot own' }, wornNow ? '입고 있어요' : '있음')
      : state === 'earn'
        ? h('div', { class: 'shop-foot earn' }, '받기!')
        : locked
          ? h('div', { class: 'shop-foot lock' }, cosmetics.unlockLabel(it))
          : h('div', { class: 'shop-foot' + (state === 'poor' ? ' poor' : '') },
              points.star(it.price));

    return h('button', {
      class: 'shop-item' + (wornNow ? ' worn' : '') + (locked ? ' locked' : ''),
      'aria-label': `${cosmetics.label(it)} ${locked ? '잠김' : ''}`,
      onclick: () => pick(it, state),
    }, body, h('div', { class: 'shop-name' }, it.label), foot);
  }

  function pick(it, state) {
    if (state === 'own') {
      cosmetics.wear(it.id);
      fx.tap();
      paintPreview(); paintGrid();
      return;
    }
    if (state === 'locked') {
      // 혼내지 않는다. 어떻게 하면 열리는지만 말해 준다.
      toast(`${cosmetics.unlockLabel(it)} 하면 열려요`);
      fx.tap();
      return;
    }
    if (state === 'poor') {
      toast(`${points.star(it.price - points.balance())} 더 모으면 살 수 있어요`);
      return;
    }
    const r = cosmetics.acquire(it.id);
    if (!r.ok) { toast('아직 살 수 없어요'); return; }
    cosmetics.wear(it.id);
    fx.fanfare();
    toast(state === 'earn' ? '새 아이템을 받았어요!' : '샀어요!');
    paintPreview(); paintGrid();
  }

  function paintGrid() {
    const ctx = cosmetics.progressCtx();
    grid.replaceChildren(...cosmetics.itemsIn(cat)
      .map((it) => tile(it, cosmetics.stateOf(it, ctx))));
  }

  paintPreview(); paintTabs(); paintGrid();

  return h('div', { class: 'screen' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': '나가기',
        onclick: () => go('home') }, '✕'),
      h('div', {},
        h('div', { class: 'h2' }, '🎨 꾸미기'),
        countEl),
      h('div', { class: 'spacer' }),
    ),

    h('div', { class: 'card shop-top' }, preview, balanceEl),
    tabRow,
    h('div', { class: 'card' }, grid),

    h('div', { class: 'note' },
      '별은 문제를 풀면 모여요. 저금통(원)과는 따로예요 — ' +
      '별로 산 것은 여기서만 쓰고, 저금통은 부모님이 진짜 돈으로 바꿔 줘요.'),
    h('div', { style: { height: '8px' } }),
  );
}
