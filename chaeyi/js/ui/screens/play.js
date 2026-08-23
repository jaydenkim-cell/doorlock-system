/**
 * 세션 화면
 *
 * 하트(생명)가 없다. 틀려도 잃는 것이 없고, 정답을 보여준 뒤 이 판이 끝날 때
 * 한 번 더 낸다. "틀리는 게 무섭다"는 감정이 생기면 아이는 앱을 피한다.
 *
 * 정답은 짧게 축하하고 바로 넘어간다. 오답일 때만 아이가 직접 눌러서 넘어가게
 * 해서, 정답을 한 번은 보고 지나가도록 만든다.
 *
 * 문제를 어떻게 그릴지는 생성기가 내려주는 q.render 서술자가 정한다.
 * (1차에는 `${q.prompt} = ?` 를 하드코딩해서 72문항이 전부 같은 틀이었다)
 */

import { h } from '../dom.js';
import * as store from '../../state.js';
import * as sess from '../../session.js';
import * as fx from '../../feedback.js';
import { numpad, choices, oxpad, fracpad, pairpad } from '../numpad.js';
import { iyeyo } from '../../ko.js';
import * as answer from '../../answer.js';
import * as theme from '../../theme.js';

/** q.render 를 보고 문제 본문을 그린다 */
export function renderBody(render) {
  if (!render) return h('div', { class: 'expr' }, '?');

  if (render.type === 'sequence') {
    return h('div', { class: 'seq' },
      render.nums.map((n) => h('div', { class: 'seq-n' + (n === null ? ' blank' : '') },
        n === null ? '?' : String(n))));
  }

  if (render.type === 'groups') {
    return h('div', { class: 'grp' },
      Array.from({ length: render.times }, () =>
        h('div', { class: 'grp-box' },
          Array.from({ length: render.per }, () =>
            h('span', { class: 'grp-e' }, render.emoji)))));
  }

  // 문장제
  if (render.type === 'text') {
    return h('div', { class: 'wordq' }, render.text);
  }

  // 연립방정식처럼 식이 여러 줄인 경우
  if (render.type === 'lines') {
    return h('div', { class: 'lines' },
      render.lines.map((l) => h('div', { class: 'line' }, l)),
      render.tail ? h('div', { class: 'line tail' }, render.tail) : null,
      render.blank ? h('div', { class: 'line blank' }, render.blank) : null);
  }

  // expr — 참·거짓도 같은 식으로 그리되 끝에 물음표를 붙이지 않는다
  return h('div', { class: 'expr' },
    render.tokens.map((tk) => (tk.frac
      ? h('span', { class: 'fr' + (tk.blank ? ' blank' : '') },
          h('span', { class: 'fr-n' }, String(tk.num)),
          h('span', { class: 'fr-d' }, String(tk.den)))
      : h('span', { class: tk.blank ? 'blank' : '' }, tk.t))));
}

/** 답 타입에 맞는 입력 위젯을 고른다 */
export function makeInput(q, onSubmit) {
  const kind = answer.inputKind(q.answer, q.mode);
  if (kind === 'choice') return choices({ options: q.choices, onSubmit });
  if (kind === 'ox') return oxpad({ onSubmit });
  if (kind === 'frac') return fracpad({ onSubmit });
  if (kind === 'pair') return pairpad({ onSubmit });
  const opt = answer.padOptions(q.answer);
  return numpad({ onSubmit, maxLen: opt.maxLen, negative: opt.negative, decimal: opt.decimal });
}

export function play(go, { skillId, groupId = null }) {
  const gen = sess.skill(skillId);
  let s = sess.startOrResume(skillId, groupId);
  let input = null;
  let locked = false;

  const pips = h('div', { class: 'pips' });
  const qBox = h('div', { class: 'q' });
  const inputSlot = h('div', {});
  const title = h('div', { class: 'h2' });
  const combo = h('div', { class: 'combo' });

  const root = h('div', { class: 'screen sess' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': '나가기', onclick: () => go('home') }, '✕'),
      h('div', {}, title, h('div', { class: 'muted' }, groupId ? '이 단만 연습해요' : '오늘의 문제')),
      h('div', { class: 'spacer' }),
      combo,
    ),
    pips,
    qBox,
    inputSlot,
  );

  function renderCombo() {
    combo.replaceChildren();
    combo.className = 'combo';
    if (s.streak >= 2) {
      combo.classList.add('on');
      if (s.streak >= 5) combo.classList.add('hot');
      combo.append(h('span', {}, s.streak >= 5 ? '🔥' : '✨'), h('b', {}, `${s.streak}연속`));
    }
  }

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
        renderBody(q.render),
        q.hint ? h('div', { class: 'hint' }, q.hint) : null,
      ),
    );

    if (input?.destroy) input.destroy();
    input = makeInput(q, submitAnswer);
    inputSlot.replaceChildren(input);

    locked = false;
    renderPips();
    renderCombo();
  }

  function submitAnswer(given) {
    if (locked) return;
    locked = true;
    const r = sess.submit(given);
    s = sess.active() || s;
    renderPips();
    renderCombo();

    if (r.correct) {
      qBox.classList.add('pop');
      setTimeout(() => qBox.classList.remove('pop'), 300);
      if (r.milestone) fx.fanfare();
      else if (r.newBest) fx.zap();
      else fx.correct();
    } else {
      qBox.classList.add('shake');
      setTimeout(() => qBox.classList.remove('shake'), 340);
      fx.wrong();
    }
    showFlash(r, () => advance(r));
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
      const praise = r.milestone ? theme.copy('combo')(r.milestone)
        : r.newBest ? theme.copy('newBest')
        : r.mastered ? theme.copy('mastered')
        : theme.copy('correct');
      el.append(
        h('div', { class: 'fl-title' }, '🎉 ' + praise),
        h('div', { class: 'fl-body' }, `${(r.ms / 1000).toFixed(1)}초 걸렸어요`),
        r.levelChanged > 0
          ? h('div', { class: 'muted', style: { marginTop: '4px' } }, '조금 더 어려운 문제가 나올 거예요')
          : null,
      );
      // 정답은 바로 넘어간다. 리듬이 끊기면 재미가 사라진다.
      setTimeout(close, r.milestone ? 1200 : 850);
    } else {
      el.append(
        h('div', { class: 'fl-title' },
          r.note === 'notReduced' ? '거의 다 왔어요' : theme.copy('wrongTitle')),
        h('div', { class: 'fl-body' }, answerLine(r)),
        r.reason ? h('div', { class: 'muted', style: { marginTop: '4px' } }, r.reason) : null,
        h('button', { class: 'btn btn-block', onclick: close }, theme.copy('wrongOk')),
      );
    }
    document.body.append(el);
  }

  function answerLine(r) {
    const a = answer.normalize(r.answer);
    if (a?.type === 'ox') return a.value === 1 ? '맞는 식이었어요 (O)' : '틀린 식이었어요 (X)';
    const text = r.answerText || answer.format(r.answer);
    // 숫자 하나일 때만 조사를 붙인다. 분수·좌표·수식에는 어색하다.
    return a?.type === 'int' ? `정답은 ${text}${iyeyo(a.value)}` : `정답: ${text}`;
  }

  // 중간에 껐다 켠 경우: 저장된 문제를 그대로 이어서 낸다
  if (!s.question) {
    const summary = sess.finish();
    if (summary) { go('result', summary); return root; }
  }
  renderQuestion();
  return root;
}
