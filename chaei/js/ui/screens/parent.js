/**
 * 부모 화면
 *
 * 이 앱의 리텐션은 여기서 나온다. 아이는 스스로 앱을 켜지 않는다.
 * 부모가 "오늘 뭐 했어?"라고 물어볼 수 있게 만드는 것이 목적이다.
 *
 * 그래서 "몇 문제 맞았다"가 아니라 "무엇을 무엇과 헷갈리고 있다"를 보여준다.
 * 정답률만 보면 곱셈구구에서 가장 중요한 것 — 손가락으로 세지 않고
 * 자동으로 나오는가 — 를 놓친다. 그래서 응답 시간을 나란히 놓는다.
 */

import { h, toast, fmtSec } from '../dom.js';
import * as store from '../../state.js';
import * as srs from '../../srs.js';
import * as sess from '../../session.js';

export function parent(go) {
  const pin = store.settings().parentPin;
  if (!pin) return dashboard(go);

  const root = h('div', { class: 'screen' });
  let entry = '';
  const disp = h('div', { class: 'pad-display is-empty' }, '····');
  const grid = h('div', { class: 'pad-grid' });

  const check = () => {
    if (entry.length < pin.length) return;
    if (entry === pin) root.replaceWith(dashboard(go));
    else { toast('번호가 달라요'); entry = ''; disp.textContent = '····'; }
  };

  for (const k of ['1','2','3','4','5','6','7','8','9','del','0','']) {
    if (k === '') { grid.append(h('div')); continue; }
    grid.append(h('button', { class: 'pad-key' + (k === 'del' ? ' pad-del' : ''),
      onclick: () => {
        entry = k === 'del' ? entry.slice(0, -1) : entry + k;
        disp.textContent = '•'.repeat(entry.length) || '····';
        check();
      } }, k === 'del' ? '⌫' : k));
  }

  root.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', onclick: () => go('home') }, '✕'),
      h('div', { class: 'h2' }, '부모님 화면'),
    ),
    h('div', { class: 'lockpad' },
      h('div', { class: 'muted', style: { marginBottom: '14px' } }, '비밀번호를 눌러주세요'),
      disp, h('div', { style: { height: '10px' } }), grid),
  );
  return root;
}

function dashboard(go) {
  const d = store.pdata();
  const p = store.activeProfile();
  const s = store.settings();
  const weekAgo = sess.weekStart();

  const weekSessions = d.sessions.filter((x) => (x.completedAt || x.startedAt) >= weekAgo);
  const items = weekSessions.flatMap((x) => x.items || []);
  const correct = items.filter((i) => i.correct).length;
  const acc = items.length ? Math.round((correct / items.length) * 100) : 0;
  const avgMs = items.length ? Math.round(items.reduce((a, i) => a + i.ms, 0) / items.length) : 0;
  const days = sess.weekStamps().filter(Boolean).length;

  return h('div', { class: 'screen parent' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', onclick: () => go('home') }, '✕'),
      h('div', {}, h('div', { class: 'h2' }, `${p.name} 학습 리포트`),
        h('div', { class: 'muted' }, '이번 주 (월요일 시작)')),
    ),

    h('div', { class: 'stat' },
      h('div', { class: 'box' }, h('b', {}, `${days}일`), h('span', {}, `학습 (목표 ${s.weeklyGoalDays}일)`)),
      h('div', { class: 'box' }, h('b', {}, `${acc}%`), h('span', {}, `정답률 (${items.length}문항)`)),
      h('div', { class: 'box' }, h('b', {}, avgMs ? fmtSec(avgMs) : '–'), h('span', {}, `평균 (목표 ${fmtSec(s.targetMs)})`)),
    ),

    weakCard(),
    trendCard(d),
    speedCard(s),

    h('div', { class: 'card' },
      h('h3', {}, '⚙️ 설정'),
      numRow('한 판 문항 수', s.sessionLength, [6, 8, 10, 12], (v) => store.updateSettings({ sessionLength: v })),
      numRow('목표 응답 시간(초)', s.targetMs / 1000, [2, 3, 4, 5], (v) => store.updateSettings({ targetMs: v * 1000 })),
      numRow('주간 목표(일)', s.weeklyGoalDays, [3, 4, 5, 6], (v) => store.updateSettings({ weeklyGoalDays: v })),
      toggleRow('소리', s.sound, (v) => store.updateSettings({ sound: v })),
      toggleRow('진동', s.haptics, (v) => store.updateSettings({ haptics: v })),
      pinRow(s),
    ),

    backupCard(),
    h('div', { style: { height: '8px' } }),
  );
}

/** 무엇을 무엇과 헷갈리는가 — 이 앱의 핵심 산출물 */
function weakCard() {
  const s = store.settings();
  const rows = [];
  for (const skillId of ['mul', 'addsub']) {
    const gen = sess.skill(skillId);
    for (const m of store.masteryList(skillId)) {
      if (!m.seen) continue;
      const acc = m.correct / m.seen;
      const slow = m.avgMs > s.targetMs;
      if (acc >= 0.8 && !slow) continue;
      rows.push({ m, gen, acc, score: (1 - acc) * 2 + (slow ? m.avgMs / s.targetMs - 1 : 0) });
    }
  }
  rows.sort((a, b) => b.score - a.score);

  if (!rows.length) {
    return h('div', { class: 'card' },
      h('h3', {}, '🔍 지금 약한 곳'),
      h('div', { class: 'muted' }, '아직 데이터가 모이지 않았어요. 몇 판 더 하면 여기에 나타납니다.'));
  }

  const table = h('table', { class: 'wk' });
  for (const { m, gen, acc } of rows.slice(0, 8)) {
    const f = gen.parseFact(m.factKey);
    const face = f.op ? `${f.a} ${f.op} ${f.b}` : `${f.a} × ${f.b}`;
    const reason = m.wrongLog[0]?.reason;
    table.append(h('tr', {},
      h('td', {}, face),
      h('td', {}, reason || (m.avgMs > s.targetMs ? '맞히지만 아직 느림 (세는 중)' : '가끔 틀림')),
      h('td', {}, `${Math.round(acc * 100)}% · ${m.avgMs ? fmtSec(m.avgMs) : '–'}`),
    ));
  }

  return h('div', { class: 'card' },
    h('h3', {}, '🔍 지금 약한 곳'),
    table,
    h('div', { class: 'note', style: { marginTop: '12px' } },
      '"맞히지만 느림"은 아직 외운 것이 아니라 손가락으로 세고 있다는 뜻입니다. ' +
      '정답률만 보면 놓치는 부분이라 시간을 함께 표시했어요.'),
  );
}

function trendCard(d) {
  const last = d.sessions.slice(-12);
  if (last.length < 2) return null;
  const s = store.settings();
  const vals = last.map((x) => x.summary?.avgMs || 0).filter(Boolean);
  const max = Math.max(...vals, s.targetMs);

  return h('div', { class: 'card' },
    h('h3', {}, '⏱ 평균 응답 시간 추이'),
    h('div', { class: 'trend' },
      vals.map((v) => h('i', {
        class: v > s.targetMs ? 'slow' : '',
        style: { height: `${Math.max(4, (v / max) * 100)}%` },
        title: fmtSec(v),
      }))),
    h('div', { class: 'muted', style: { marginTop: '8px' } },
      `막대가 낮아질수록 좋아요. 주황색은 목표(${fmtSec(s.targetMs)})보다 느린 판입니다.`),
  );
}

function speedCard(s) {
  const gen = sess.skill('mul');
  const mastered = store.masteryList('mul').filter((m) => srs.isMastered(m, s.targetMs)).length;
  const total = gen.allFacts().length;
  return h('div', { class: 'card' },
    h('h3', {}, '📚 곱셈구구 진도'),
    h('div', { class: 'row' },
      h('b', { style: { fontSize: '26px' } }, `${mastered}`),
      h('div', { class: 'muted' }, `/ ${total}문항 마스터`),
    ),
    h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round((mastered / total) * 100)}%` } })),
    h('div', { class: 'muted', style: { marginTop: '8px' } },
      `마스터 기준: 복습 간격 7일 이상까지 살아남고, 평균 ${fmtSec(s.targetMs)} 안에 답하는 문항`),
  );
}

function numRow(label, value, options, onPick) {
  const row = h('div', { class: 'row row-wrap', style: { padding: '10px 0', borderTop: '1px solid var(--line)' } },
    h('div', { style: { flex: '1 0 100%', fontWeight: '700', fontSize: '15px', marginBottom: '2px' } }, label));
  for (const o of options) {
    row.append(h('button', {
      class: 'btn btn-sm' + (o === value ? '' : ' btn-ghost'),
      style: o === value ? { background: 'var(--grape)', color: '#fff', boxShadow: '0 3px 0 var(--grape-d)' } : {},
      onclick: (e) => { onPick(o); toast('저장했어요'); rerenderRow(e.target); },
    }, String(o)));
  }
  return row;
}

function toggleRow(label, value, onSet) {
  const btn = h('button', { class: 'btn btn-sm btn-ghost' }, value ? '켜짐' : '꺼짐');
  let v = value;
  btn.addEventListener('click', () => { v = !v; onSet(v); btn.textContent = v ? '켜짐' : '꺼짐'; });
  return h('div', { class: 'row', style: { padding: '10px 0', borderTop: '1px solid var(--line)' } },
    h('div', { style: { flex: '1', fontWeight: '700', fontSize: '15px' } }, label), btn);
}

function pinRow(s) {
  const btn = h('button', { class: 'btn btn-sm btn-ghost' }, s.parentPin ? '변경' : '설정');
  btn.addEventListener('click', () => {
    const v = prompt('부모 화면 잠금 번호 (숫자 4자리, 비우면 해제)', s.parentPin || '');
    if (v === null) return;
    const clean = v.replace(/\D/g, '').slice(0, 4);
    store.updateSettings({ parentPin: clean });
    btn.textContent = clean ? '변경' : '설정';
    toast(clean ? '잠금을 켰어요' : '잠금을 껐어요');
  });
  return h('div', { class: 'row', style: { padding: '10px 0', borderTop: '1px solid var(--line)' } },
    h('div', { style: { flex: '1', fontWeight: '700', fontSize: '15px' } },
      '잠금 번호', h('div', { class: 'muted' }, s.parentPin ? '켜져 있음' : '없음')), btn);
}

/**
 * 백업. localStorage 는 브라우저 캐시를 지우면 사라진다.
 * 아이가 석 달 쌓은 기록이 날아가면 그걸로 끝이다.
 */
function backupCard() {
  const ta = h('textarea', { class: 'io', placeholder: '백업 내용을 여기에 붙여 넣고 "불러오기"를 누르세요' });
  return h('div', { class: 'card' },
    h('h3', {}, '💾 백업'),
    h('div', { class: 'note', style: { marginBottom: '10px' } },
      '기록은 이 브라우저 안에만 있습니다. 브라우저 저장소를 지우면 사라지니 가끔 백업해 두세요.'),
    h('div', { class: 'row', style: { marginBottom: '10px' } },
      h('button', { class: 'btn btn-sm btn-ghost', onclick: async () => {
        const text = store.exportJSON();
        ta.value = text;
        try { await navigator.clipboard.writeText(text); toast('복사했어요'); }
        catch { toast('아래 칸의 내용을 복사하세요'); }
      } }, '내보내기'),
      h('button', { class: 'btn btn-sm btn-ghost', onclick: () => {
        try { store.importJSON(ta.value); toast('불러왔어요'); location.reload(); }
        catch (e) { toast(e.message); }
      } }, '불러오기'),
    ),
    ta,
  );
}

function rerenderRow(el) {
  const row = el.parentElement;
  for (const b of row.querySelectorAll('button')) {
    b.className = 'btn btn-sm btn-ghost';
    b.style.background = ''; b.style.color = ''; b.style.boxShadow = '';
  }
  el.className = 'btn btn-sm';
  el.style.background = 'var(--grape)'; el.style.color = '#fff'; el.style.boxShadow = '0 3px 0 var(--grape-d)';
}
