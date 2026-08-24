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

import { h, toast, fmtSec, kids } from '../dom.js';
import * as store from '../../state.js';
import * as srs from '../../srs.js';
import * as sess from '../../session.js';
import * as ops from '../../ops.js';
import * as difficulty from '../../difficulty.js';
import * as allowance from '../../allowance.js';
import * as grades from '../../grades.js';
import { lock } from './lock.js';

export function parent(go, { unlocked = false } = {}) {
  // 잠금을 방금 설정하고 넘어온 경우. 라우터가 넘겨주는 값이라 아이가 만들 수 없다.
  if (unlocked) return dashboard(go);

  const pin = store.settings().parentPin;
  // 잠금이 없으면 대시보드를 그냥 열지 않는다. 이 뒤에 저금통 현금 지급이 있다.
  //
  // 여기서 go('lock') 을 부르면 안 된다. 화면을 그리는 도중에 라우터를 다시 부르면
  // 잠금 화면을 그린 뒤 바깥 go() 가 이 함수의 반환값으로 덮어써 버려서 빈 화면이 된다.
  // 라우팅하지 말고 잠금 화면을 그대로 조립해서 돌려준다.
  if (!pin) return lock(go, { next: 'parent' });

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
      h('div', { class: 'box' }, h('b', {}, avgMs ? fmtSec(avgMs) : '–'), h('span', {}, '평균 응답')),
    ),

    kidsCard(go),
    opsCard(),
    walletCard(go),
    levelCard(),
    weakCard(),
    trendCard(d),
    speedCard(),

    h('div', { class: 'card' },
      h('h3', {}, '⚙️ 설정'),
      numRow('한 판 문항 수', s.sessionLength, [6, 8, 10, 12], (v) => store.updateSettings({ sessionLength: v })),
      presetRow(s),
      numRow('주간 목표(일)', s.weeklyGoalDays, [3, 4, 5, 6], (v) => store.updateSettings({ weeklyGoalDays: v })),
      toggleRow('소리', s.sound, (v) => store.updateSettings({ sound: v })),
      toggleRow('진동', s.haptics, (v) => store.updateSettings({ haptics: v })),
      pinRow(s),
      placementRow(),
    ),

    backupCard(),
    h('div', { style: { height: '8px' } }),
  );
}

/**
 * 아이 관리 — 추가 / 학년 / 삭제
 *
 * 진도·저금통·난이도가 전부 아이별로 나뉘어 있어서(state.js 의 data[profileId])
 * 여기서 만들기만 하면 나머지는 저절로 분리된다.
 */
function kidsCard(go) {
  const list = store.profiles();
  const activeId = store.activeProfile()?.id;
  const card = h('div', { class: 'card' });

  const rows = list.map((p) => {
    const isActive = p.id === activeId;
    const row = h('div', { class: 'kid-row' },
      h('div', { class: 'who-face sm' }, p.avatar),
      h('div', { style: { flex: '1' } },
        h('div', { style: { fontWeight: '800' } }, p.name,
          isActive ? h('span', { class: 'chip', style: { marginLeft: '6px', fontSize: '11px' } }, '지금') : null),
        h('div', { class: 'muted' }, grades.of(p.grade).label),
      ),
    );

    // 학년 바꾸기 — 1~9 를 한 줄에 늘어놓으면 버튼이 너무 작아 접어 넣는다
    const setGrade = (g) => {
      const was = store.activeProfile()?.id;
      store.setActiveProfile(p.id);
      store.updateProfile({ grade: g });
      if (was && was !== p.id) store.setActiveProfile(was);
      toast(`${p.name} · ${grades.GRADES[g].label}`);
      go('parent');
    };
    const sel = h('select', { class: 'grade-sel', 'aria-label': `${p.name} 학년`,
      onchange: (e) => setGrade(Number(e.target.value)) });
    for (const band of grades.GRADE_BANDS) {
      const grp = h('optgroup', { label: band.label });
      for (const g of band.keys) {
        grp.append(h('option', { value: String(g), ...(p.grade === g ? { selected: 'selected' } : {}) },
          grades.GRADES[g].label));
      }
      sel.append(grp);
    }
    row.append(sel);

    row.append(h('button', { class: 'btn btn-sm btn-ghost', onclick: () => removeKid(p) }, '삭제'));
    return row;
  });

  function removeKid(p) {
    const was = store.activeProfile()?.id;
    store.setActiveProfile(p.id);
    const bal = allowance.enabled() ? allowance.balance() : 0;
    if (was && was !== p.id) store.setActiveProfile(was);

    // 잔액은 실제 돈 약속이다. 지우기 전에 금액을 보여주고 한 번 더 묻는다.
    const warn = bal > 0
      ? `\n\n저금통에 ${allowance.won(bal)}이 남아 있어요. 함께 사라집니다.`
      : '';
    if (!confirm(`${p.name}의 진도와 기록을 모두 지울까요?${warn}\n\n되돌릴 수 없어요.`)) return;

    const next = store.deleteProfile(p.id);
    toast(`${p.name}을(를) 지웠어요`);
    go(next ? 'parent' : 'onboard');
  }

  card.append(...kids(
    h('h3', {}, `👧 아이 (${list.length}명)`),
    ...rows,
    h('button', { class: 'btn btn-sm btn-ghost', style: { marginTop: '10px' },
      onclick: () => go('onboard2') }, '+ 아이 추가'),
    list.length > 1
      ? h('div', { class: 'note', style: { marginTop: '10px' } },
          '아이가 여럿이면 앱을 켤 때 "누구야?" 화면이 먼저 뜹니다. ' +
          '홈 화면 왼쪽 위 얼굴을 눌러도 바꿀 수 있어요.')
      : null,
    h('div', { class: 'muted', style: { marginTop: '8px', fontSize: '13px' } },
      '학년이 무엇을 낼지 정합니다. 초1은 곱셈구구를 잠그고 받아올림을 한 자리로, ' +
      '초4부터는 나눗셈·분수·소수, 중1부터는 정수·방정식이 열려요. ' +
      '초4 이상은 화면 톤도 차분하게 바뀝니다.'),
  ));
  return card;
}

/**
 * 용돈 저금통 — 잔액, 적립 내역, 현금 지급.
 *
 * 여기 적힌 잔액은 실제 돈 약속이다. 그래서 지급에는 잠금 번호를 반드시 요구하고,
 * 지급 내역을 남겨서 나중에 "언제 얼마 줬더라"가 서로 확인 가능하게 한다.
 */
function walletCard(go) {
  if (!allowance.enabled()) {
    const off = h('div', { class: 'card' });
    const on = h('button', { class: 'btn btn-sm btn-ghost', onclick: () => {
      allowance.setConfig({ enabled: true }); go('parent');
    } }, '켜기');
    off.append(
      h('div', { class: 'row' },
        h('h3', { style: { flex: '1', marginBottom: '0' } }, '🐷 용돈 저금통'), on),
      h('div', { class: 'muted', style: { marginTop: '8px' } },
        '이 아이는 저금통을 쓰지 않아요'));
    return off;
  }
  const c = allowance.config();
  const bal = allowance.balance();
  const weeks = allowance.weeksToGoal();

  const card = h('div', { class: 'card' });

  const doPayout = () => {
    if (!store.settings().parentPin) {
      toast('먼저 잠금 번호를 설정해 주세요');
      return;
    }
    const raw = prompt(`얼마를 현금으로 줄까요? (잔액 ${allowance.won(bal)})`, String(bal));
    if (raw === null) return;
    const memo = prompt('메모 (선택)', '') || '';
    const r = allowance.payout(raw.replace(/[^\d]/g, ''), memo);
    if (!r.ok) {
      toast({ PIN_REQUIRED: '잠금 번호를 먼저 설정하세요',
              BAD_AMOUNT: '금액을 확인해 주세요',
              INSUFFICIENT: '잔액보다 많아요' }[r.reason] || '지급하지 못했어요');
      return;
    }
    toast('지급 기록을 남겼어요');
    go('parent');
  };

  const onoff = h('button', { class: 'btn btn-sm' + (allowance.enabled() ? '' : ' btn-ghost') },
    allowance.enabled() ? '켜짐' : '꺼짐');
  onoff.addEventListener('click', () => {
    allowance.setConfig({ enabled: !allowance.enabled() });
    toast(allowance.enabled() ? '저금통을 켰어요' : '저금통을 껐어요');
    go('parent');
  });

  card.append(
    h('div', { class: 'row' },
      h('h3', { style: { flex: '1', marginBottom: '0' } }, '🐷 용돈 저금통'), onoff),
    h('div', { style: { height: '10px' } }),
    h('div', { class: 'row', style: { marginBottom: '10px' } },
      h('b', { style: { fontSize: '30px', fontVariantNumeric: 'tabular-nums' } }, allowance.won(bal)),
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn btn-sm btn-ghost', onclick: doPayout,
                    disabled: bal <= 0 }, '현금으로 주기'),
    ),
    h('div', { class: 'bar' },
      h('i', { style: { width: `${Math.round(allowance.progress() * 100)}%`, background: 'var(--mint)' } })),
    h('div', { class: 'muted', style: { marginTop: '8px' } },
      `목표 ${allowance.won(c.goal)} · 지금까지 모두 ${allowance.won(allowance.lifetime())} 모았어요`),
  );

  // 사용자가 정한 금액을 말없이 바꾸지 않는 대신, 속도를 눈에 보이게 한다.
  if (Number.isFinite(weeks) && bal < c.goal) {
    const slow = weeks > 12;
    card.append(h('div', { class: 'note', style: slow ? { background: 'var(--sun-l)' } : {} },
      `지금 설정(한 판 ${allowance.won(c.perSession)} · 하루 ${c.dailySessionCap}판)이면 ` +
      `목표까지 약 ${weeks}주 걸려요.` +
      (slow ? ' 초2에게 반년은 너무 멉니다. 한 판 금액을 올리거나 목표를 낮추는 쪽을 권해요.' : '')));
  }

  card.append(
    numRow('한 판 금액(원)', c.perSession, [10, 50, 100, 200], (v) => allowance.setConfig({ perSession: v })),
    numRow('하루 적립 판수', c.dailySessionCap, [2, 3, 5, 10], (v) => allowance.setConfig({ dailySessionCap: v })),
    numRow('목표 금액(원)', c.goal, [1000, 3000, 5000, 10000], (v) => allowance.setConfig({ goal: v })),
  );

  const led = allowance.ledger().slice(0, 8);
  if (led.length) {
    const table = h('table', { class: 'wk', style: { marginTop: '10px' } });
    for (const e of led) {
      const d = new Date(e.at);
      table.append(h('tr', {},
        h('td', { style: { width: '58px', fontWeight: '600' } }, `${d.getMonth() + 1}/${d.getDate()}`),
        h('td', {}, e.note || allowance.kindLabel(e.kind)),
        h('td', { style: { color: e.amount < 0 ? 'var(--coral)' : 'var(--mint)', fontWeight: '800' } },
          `${e.amount > 0 ? '+' : ''}${allowance.won(e.amount)}`),
      ));
    }
    card.append(h('h3', { style: { marginTop: '14px' } }, '내역'), table);
  }

  card.append(h('div', { class: 'note', style: { marginTop: '12px' } },
    '잔액은 이 브라우저 안에만 있습니다. 실제 돈 약속이니 아래 백업을 가끔 받아 두세요.'));
  return card;
}

/** 생성기마다 factKey 모양이 달라서 예쁘게 못 쓰는 것은 키를 그대로 보여준다 */
function factLabel(gen, key) {
  try {
    const f = gen.parseFact(key);
    if (f && f.a !== undefined && f.b !== undefined && !f.kind) {
      return f.op ? `${f.a} ${f.op} ${f.b}` : `${f.a} × ${f.b}`;
    }
  } catch { /* 키 모양이 다른 생성기 */ }
  return key;
}

/**
 * 어떤 연산을 낼지.
 *
 * 기본은 학년을 따른다 (초2 = 더하기·빼기·곱하기). 여기서 켜고 끌 수 있게 한 것은
 * 두 경우 때문이다.
 *  - 아이가 한 연산을 특히 어려워해서 당분간 그것만 집중시키고 싶을 때
 *  - 학년보다 앞서 나가는 아이에게 다음 연산을 미리 열어 주고 싶을 때
 *
 * 학년에 없는 연산을 켜면 그 생성기도 함께 열린다 (초2에 나눗셈을 켜면 divide).
 * 다만 나눗셈은 곱셈구구를 어느 정도 외운 뒤라야 의미가 있어서, 그 점은 적어 둔다.
 */
function opsCard() {
  const card = h('div', { class: 'card' });

  function draw() {
    const on = sess.openOps();
    const unlocked = ops.unlocked();
    const rows = ops.OPS.map((op) => {
      const live = on.includes(op.id);
      const byGrade = unlocked.includes(op.id);
      const btn = h('button', {
        class: 'btn btn-sm' + (live ? '' : ' btn-ghost'),
        style: live ? { background: `var(--${op.color})`, color: '#fff' } : {},
        onclick: () => {
          const next = live ? on.filter((x) => x !== op.id) : [...on, op.id];
          if (!next.length) { toast('연산을 하나는 켜 두어야 해요'); return; }
          ops.setEnabled(next);
          toast(`${op.label} ${live ? '껐어요' : '켰어요'}`);
          draw();
        },
      }, live ? '켜짐' : '꺼짐');

      return h('div', { class: 'row', style: { padding: '10px 0', borderTop: '1px solid var(--line)' } },
        h('div', { style: { flex: '1', fontWeight: '700', fontSize: '15px' } },
          `${op.sign} ${op.label}`,
          h('div', { class: 'muted' }, byGrade
            ? `${sess.opFacts(op.id).length}문항 · 숙련도 ${Math.round(sess.opRatio(op.id) * 100)}%`
            : live ? `${p.grade <= 2 && op.id === 'div' ? '곱셈구구를 외운 뒤가 좋아요 · ' : ''}학년보다 앞서 여는 중`
                   : ops.whenLearned(op.id))),
        btn);
    });

    card.replaceChildren(...kids(
      h('h3', {}, '➗ 어떤 연산을 낼까'),
      h('div', { class: 'note' },
        ops.isDefault()
          ? '지금은 학년(' + grades.of().label + ') 기준으로 자동 선택돼 있어요. "오늘의 공부"는 켜진 연산을 섞어서 냅니다.'
          : '직접 고른 상태예요. 학년 기준으로 되돌리려면 아래 버튼을 누르세요.'),
      ...rows,
      ops.isDefault() ? null
        : h('div', { class: 'row', style: { padding: '10px 0', borderTop: '1px solid var(--line)' } },
            h('div', { style: { flex: '1' }, class: 'muted' }, `학년 기준: ${gradeOpsText()}`),
            h('button', { class: 'btn btn-sm btn-ghost', onclick: () => {
              ops.setEnabled(null); toast('학년 기준으로 되돌렸어요'); draw();
            } }, '되돌리기')),
    ));
  }

  const p = store.activeProfile();
  draw();
  return card;
}

function gradeOpsText() {
  return ops.unlocked().map((id) => ops.opInfo(id).sign).join(' ') || '없음';
}

/**
 * 지금 난이도가 어디쯤인지.
 * 부모가 "너무 어려워해요" 할 때 무엇을 건드려야 하는지 보이게 한다.
 */
function levelCard() {
  const p = difficulty.preset();
  const rows = [];
  // 이 아이 학년에서 열려 있는 스킬만 보여준다
  for (const skillId of sess.openSkills()) {
    const gen = sess.skill(skillId);
    const lv = difficulty.levelOf(skillId);
    const open = difficulty.unlockedVariants(gen, lv).length;
    rows.push(h('tr', {},
      h('td', {}, gen.title),
      h('td', {}, `레벨 ${lv} · 형태 ${open}종 · 목표 ${fmtSec(sess.skillTargetMs(skillId))}`),
      h('td', {}, '●'.repeat(lv) + '○'.repeat(difficulty.MAX_LEVEL - lv)),
    ));
  }
  const mainSkill = sess.openSkills()[0] || 'mul';
  const best = sess.rallyBest(mainSkill);

  return h('div', { class: 'card' },
    h('h3', {}, '🎚 지금 난이도'),
    h('table', { class: 'wk' }, rows),
    h('div', { class: 'note', style: { marginTop: '12px' } },
      `설정 "${p.label}" — ${p.note}. 레벨이 오르면 역방향·뛰어세기·참거짓 같은 형태가 ` +
      '차례로 열립니다. 목표 시간은 과목마다 다릅니다 — 곱셈구구는 3초 자동화가 목표지만 ' +
      '일차방정식은 30초에 푸는 게 정상이라, 하나의 기준으로 재지 않습니다.'),
    best ? h('div', { class: 'muted', style: { marginTop: '10px' } },
      `⚡️ 60초 랠리 최고 기록 ${best}개`) : null,
  );
}

/** 무엇을 무엇과 헷갈리는가 — 이 앱의 핵심 산출물 */
function weakCard() {
  const rows = [];
  for (const skillId of sess.openSkills()) {
    const gen = sess.skill(skillId);
    const target = sess.skillTargetMs(skillId);
    for (const m of store.masteryList(skillId)) {
      if (!m.seen) continue;
      const acc = m.correct / m.seen;
      const slow = m.avgMs > target;
      if (acc >= 0.8 && !slow) continue;
      rows.push({ m, gen, acc, target, score: (1 - acc) * 2 + (slow ? m.avgMs / target - 1 : 0) });
    }
  }
  rows.sort((a, b) => b.score - a.score);

  if (!rows.length) {
    return h('div', { class: 'card' },
      h('h3', {}, '🔍 지금 약한 곳'),
      h('div', { class: 'muted' }, '아직 데이터가 모이지 않았어요. 몇 판 더 하면 여기에 나타납니다.'));
  }

  const table = h('table', { class: 'wk' });
  for (const { m, gen, acc, target } of rows.slice(0, 8)) {
    const face = factLabel(gen, m.factKey);
    const reason = m.wrongLog[0]?.reason;
    table.append(h('tr', {},
      h('td', {}, face),
      h('td', {}, reason || (m.avgMs > target ? '맞히지만 아직 느림 (세는 중)' : '가끔 틀림')),
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
  const target = sess.skillTargetMs(sess.openSkills()[0] || 'mul');
  const vals = last.map((x) => x.summary?.avgMs || 0).filter(Boolean);
  const max = Math.max(...vals, target);

  return h('div', { class: 'card' },
    h('h3', {}, '⏱ 평균 응답 시간 추이'),
    h('div', { class: 'trend' },
      vals.map((v) => h('i', {
        class: v > target ? 'slow' : '',
        style: { height: `${Math.max(4, (v / max) * 100)}%` },
        title: fmtSec(v),
      }))),
    h('div', { class: 'muted', style: { marginTop: '8px' } },
      `막대가 낮아질수록 좋아요. 주황색은 목표(${fmtSec(target)})보다 느린 판입니다.`),
  );
}

function speedCard() {
  const skillId = sess.openSkills()[0] || 'mul';
  const gen = sess.skill(skillId);
  const target = sess.skillTargetMs(skillId);
  const mastered = store.masteryList(skillId).filter((m) => srs.isMastered(m, target)).length;
  const total = gen.allFacts().length;
  return h('div', { class: 'card' },
    h('h3', {}, `📚 ${gen.title} 진도`),
    h('div', { class: 'row' },
      h('b', { style: { fontSize: '26px' } }, `${mastered}`),
      h('div', { class: 'muted' }, `/ ${total}문항 마스터`),
    ),
    h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round((mastered / total) * 100)}%` } })),
    h('div', { class: 'muted', style: { marginTop: '8px' } },
      `마스터 기준: 복습 간격 7일 이상까지 살아남고, 평균 ${fmtSec(target)} 안에 답하는 문항`),
  );
}

function presetRow(s) {
  const row = h('div', { class: 'row row-wrap', style: { padding: '10px 0', borderTop: '1px solid var(--line)' } },
    h('div', { style: { flex: '1 0 100%', fontWeight: '700', fontSize: '15px', marginBottom: '2px' } },
      '난이도', h('span', { class: 'muted' }, ` · ${difficulty.preset().note}`)));
  for (const key of difficulty.PRESET_KEYS) {
    const p = difficulty.PRESETS[key];
    const on = s.difficulty === key;
    row.append(h('button', {
      class: 'btn btn-sm' + (on ? '' : ' btn-ghost'),
      style: on ? { background: 'var(--grape)', color: '#fff', boxShadow: '0 3px 0 var(--grape-d)' } : {},
      onclick: (e) => {
        difficulty.setPreset(key);
        toast(`난이도: ${p.label}`);
        rerenderRow(e.target);
      },
    }, p.label));
  }
  return row;
}

function placementRow() {
  const btn = h('button', { class: 'btn btn-sm btn-ghost', onclick: () => {
    sess.resetPlacement();
    toast('홈에서 다시 볼 수 있어요');
  } }, '다시 하기');
  return h('div', { class: 'row', style: { padding: '10px 0', borderTop: '1px solid var(--line)' } },
    h('div', { style: { flex: '1', fontWeight: '700', fontSize: '15px' } },
      '실력 진단',
      h('div', { class: 'muted' }, sess.placementDone() ? '완료함' : '아직 안 함')),
    btn);
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
      '백업 하나에 모든 아이의 기록과 저금통이 함께 담깁니다. ' +
      '브라우저 저장소를 지우면 사라지니 가끔 받아 두세요.'),
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
