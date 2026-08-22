/**
 * 세션 화면
 *
 * 하트(생명)가 없다. 틀려도 잃는 것이 없고, 정답을 보여준 뒤 이 판이 끝날 때
 * 한 번 더 낸다. "틀리는 게 무섭다"는 감정이 생기면 아이는 앱을 피한다.
 *
 * 정답은 짧게 축하하고 바로 넘어간다. 오답일 때만 아이가 직접 눌러서 넘어가게
 * 해서, 정답을 한 번은 보고 지나가도록 만든다.
 */

import { h } from '../dom.js';
import * as store from '../../state.js';
import * as sess from '../../session.js';
import * as fx from '../../feedback.js';
import { numpad, choices } from '../numpad.js';
import { iyeyo } from '../../ko.js';

export function play(go, { skillId, groupId = null }) {
  const gen = sess.skill(skillId);
  let s = sess.startOrResume(skillId, groupId);
  let input = null;
  let locked = false;

  const pips = h('div', { class: 'pips' });
  const qBox = h('div', { class: 'q' });
  const inputSlot = h('div', {});
  const title = h('div', { class: 'h2' });

  const root = h('div', { class: 'screen sess' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': '나가기', onclick: () => go('home') }, '✕'),
      h('div', {}, title, h('div', { class: 'muted' }, groupId ? '이 단만 연습해요' : '오늘의 문제')),
    ),
    pips,
    qBox,
    inputSlot,
  );

  function renderPips() {
    const p = sess.progress(s);
    pips.replaceChildren();
    const marks = s.items.map((i) => (i.correct ? 'ok' : 'no'));
    const total = p.total + p.bonusTotal;
    for (let i = 0; i < total; i++) {
      let cls = 'pip';
      if (i < marks.length) cls += ' ' + marks[i];
      else if (i === marks.length) cls += ' now';
      else if (i >= p.total) cls += ' bonus';
      pips.append(h('div', { class: cls }));
    }
  }

  function renderQuestion() {
    const q = s.question;
    if (!q) return;
    title.textContent = `${gen.title}${groupId ? ' · ' + gen.groups().find((g) => g.id === groupId).label : ''}`;
    qBox.replaceChildren(
      h('div', {},
        h('div', { class: 'expr' }, `${q.prompt} = ?`),
        q.mode === 'choice' ? h('div', { class: 'hint' }, q.hint) : null,
      ),
    );

    if (input?.destroy) input.destroy();
    input = q.mode === 'choice'
      ? choices({ options: q.choices, onSubmit: answer })
      : numpad({ onSubmit: answer, maxLen: 3 });
    inputSlot.replaceChildren(input);
    locked = false;
    renderPips();
  }

  function answer(given) {
    if (locked) return;
    locked = true;
    const r = sess.submit(given);
    s = sess.active() || s;
    renderPips();

    if (r.correct) {
      qBox.classList.add('pop');
      setTimeout(() => qBox.classList.remove('pop'), 300);
      if (r.newBest) fx.zap(); else fx.correct();
      showFlash(r, () => advance(r));
    } else {
      qBox.classList.add('shake');
      setTimeout(() => qBox.classList.remove('shake'), 340);
      fx.wrong();
      showFlash(r, () => advance(r));
    }
  }

  function advance(r) {
    if (r.done) {
      const summary = sess.finish();
      fx.fanfare();
      go('result', summary);
      return;
    }
    s = sess.active();
    renderQuestion();
  }

  function showFlash(r, next) {
    const el = h('div', { class: 'flash ' + (r.correct ? 'ok' : 'no') });
    const close = () => { el.remove(); next(); };

    if (r.correct) {
      const praise = r.newBest ? '최고 기록! ⚡️' : r.mastered ? '완전히 외웠어요! ⭐️' : '정답이에요!';
      el.append(
        h('div', { class: 'fl-title' }, '🎉 ' + praise),
        h('div', { class: 'fl-body' }, `${(r.ms / 1000).toFixed(1)}초 걸렸어요`),
      );
      // 정답은 바로 넘어간다. 리듬이 끊기면 재미가 사라진다.
      setTimeout(close, 850);
    } else {
      el.append(
        h('div', { class: 'fl-title' }, '괜찮아요, 다시 해봐요'),
        h('div', { class: 'fl-body' }, `정답은 ${r.answer}${iyeyo(r.answer)}`),
        r.reason ? h('div', { class: 'muted', style: { marginTop: '4px' } }, r.reason) : null,
        h('button', { class: 'btn btn-block', onclick: close }, '알겠어요'),
      );
    }
    document.body.append(el);
  }

  // 중간에 껐다 켠 경우: 저장된 문제를 그대로 이어서 낸다
  if (!s.question) {
    const summary = sess.finish();
    if (summary) { go('result', summary); return root; }
  }
  renderQuestion();
  return root;
}
