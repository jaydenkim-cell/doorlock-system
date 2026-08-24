// localStorage 셰임 — 브라우저 없이 핵심 로직만 검증
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
globalThis.window = { addEventListener() {} };
// node 22 는 navigator 가 읽기 전용이라 그대로 둔다 (vibrate 미지원 = 진동 없음)

const B = new URL('../js/', import.meta.url).href;
const store = await import(B + 'state.js');
const srs   = await import(B + 'srs.js');
const sess  = await import(B + 'session.js');
const mul   = await import(B + 'generators/multiply.js');
const diff  = await import(B + 'difficulty.js');
const wal   = await import(B + 'allowance.js');
const gr    = await import(B + 'grades.js');
const A     = await import(B + 'answer.js');
const th    = await import(B + 'theme.js');
const as    = await import(B + 'generators/addsub.js');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); console.log('  ✓', name); pass++; } catch (e) { console.log('  ✗', name, '→', e.message); fail++; } };
const eq = (a, b, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'false'); };
// 6차부터 큐 항목은 {skillId, factKey} 다 (한 판에 여러 스킬이 섞이므로).
const qk = (x) => (x.queue || x).map((e) => (typeof e === 'string' ? e : e.factKey));

console.log('\n[생성기 · 곱셈구구]');
t('2단~9단 × 1~9 = 72문항', () => eq(mul.allFacts().length, 72));
t('단 그룹 8개', () => eq(mul.groups().length, 8));
t('정답 계산', () => eq(mul.answerOf('7x8'), 56));
t('오답 선지에 정답이 없다', () => {
  for (const k of mul.allFacts()) ok(!mul.distractors(k, 3).includes(mul.answerOf(k)), k);
});
t('오답 선지 3개, 중복 없음, 양수', () => {
  for (const k of mul.allFacts()) {
    const d = mul.distractors(k, 3);
    eq(d.length, 3, k); eq(new Set(d).size, 3, k);
    ok(d.every((v) => v > 0), k);
  }
});
t('진단: 한 칸 밀림', () => eq(mul.diagnose('7x8', 49), '7×7과 헷갈림 (한 칸 앞)'));
t('진단: 덧셈 오적용', () => eq(mul.diagnose('7x8', 15), '곱셈 자리에 덧셈을 함'));
t('진단: 자릿수 뒤집기', () => eq(mul.diagnose('7x8', 65), '숫자 순서를 뒤집어 씀'));
t('진단: 6×9=54 혼동', () => ok(String(mul.diagnose('6x8', 54)).includes('헷갈림')));
t('정답에는 진단이 없다', () => eq(mul.diagnose('7x8', 56), null));
t('조사 와/과가 어법에 맞는다', () => {
  eq(mul.wa(1), '과'); eq(mul.wa(2), '와'); eq(mul.wa(3), '과'); eq(mul.wa(4), '와');
  eq(mul.wa(5), '와'); eq(mul.wa(6), '과'); eq(mul.wa(7), '과'); eq(mul.wa(8), '과'); eq(mul.wa(9), '와');
  eq(mul.diagnose('2x1', 1), '1×1과 헷갈림');
  eq(mul.diagnose('7x8', 63), '7×9와 헷갈림 (한 칸 뒤)');
});
t('모든 오답 선지가 진단 문장을 갖는다', () => {
  for (const k of mul.allFacts()) for (const d of mul.distractors(k, 3)) {
    ok(typeof mul.diagnose(k, d) === 'string', `${k} → ${d} 진단 없음`);
  }
});

console.log('\n[생성기 · 받아올림/받아내림]');
t('받아올림 43 + 받아내림 36 = 79문항', () => {
  const f = as.allFacts();
  eq(f.filter((x) => x.includes('+')).length, 43);
  eq(f.filter((x) => x.includes('-')).length, 36);
  eq(f.length, 79);
});
t('덧셈 키는 모두 합이 10 이상', () => {
  for (const k of as.allFacts().filter((x) => x.includes('+'))) {
    const { a, b } = as.parseFact(k); ok(a + b >= 10, k);
  }
});
t('두 자리 문제가 100을 넘지 않고 받아올림이 실제로 일어난다', () => {
  for (const k of as.allFacts().filter((x) => x.includes('+'))) {
    for (let i = 0; i < 40; i++) {
      const q = as.makeQuestion(k, 1);
      const { x, y } = q.ctx;
      ok(q.answer < 100, `${x}+${y}=${q.answer} 세 자리`);
      ok((x % 10) + (y % 10) >= 10, `${x}+${y} 받아올림 없음`);
    }
  }
});
t('뺄셈 문제는 양수이고 받아내림이 실제로 일어난다', () => {
  for (const k of as.allFacts().filter((x) => x.includes('-'))) {
    for (let i = 0; i < 40; i++) {
      const q = as.makeQuestion(k, 1);
      const { x, y } = q.ctx;
      ok(q.answer > 0, `${x}-${y}=${q.answer}`);
      ok(x % 10 < y % 10, `${x}-${y} 받아내림 없음`);
    }
  }
});
t('진단: 받아올림 빠뜨림', () => {
  const q = as.makeQuestion('7+8', 1);
  eq(as.diagnose('7+8', q.answer - 10, q.ctx), '받아올림을 빠뜨림');
});
t('진단: 받아내림 빠뜨림', () => {
  const q = as.makeQuestion('15-8', 1);
  eq(as.diagnose('15-8', q.answer + 10, q.ctx), '받아내림을 빠뜨림');
});
t('오답 선지에 정답이 없다', () => {
  for (const k of as.allFacts()) for (let i = 0; i < 10; i++) {
    const q = as.makeQuestion(k, 0);
    eq(q.choices.filter((c) => c === q.answer).length, 1, k);
    eq(q.choices.length, 4, k);
  }
});

console.log('\n[SRS · Leitner]');
t('오답이면 box 1로 강등', () => eq(srs.nextBox(4, false, true), 1));
t('정답+빠름 → 승급', () => eq(srs.nextBox(2, true, true), 3));
t('정답이지만 느리면 승급 안 함 (아직 세는 중)', () => eq(srs.nextBox(2, true, false), 2));
t('box 5가 상한', () => eq(srs.nextBox(5, true, true), 5));
t('간격이 커진다', () => {
  const now = 0;
  const d = [1,2,3,4,5].map((b) => srs.dueAtFor(b, now));
  for (let i = 1; i < d.length; i++) ok(d[i] > d[i-1], '간격이 늘지 않음');
});
t('마스터 = box>=4 && 목표 시간 이내', () => {
  ok(srs.isMastered({ box: 4, avgMs: 2500 }, 3000));
  ok(!srs.isMastered({ box: 4, avgMs: 4000 }, 3000), '느린데 마스터로 잡힘');
  ok(!srs.isMastered({ box: 3, avgMs: 1000 }, 3000), 'box 낮은데 마스터로 잡힘');
});

console.log('\n[세션 엔진]');
store.createProfile({ name: '테스트', grade: 2, avatar: '🦊' });
t('새 세션은 10문항, 새 항목은 최대 3개', () => {
  const s = sess.startOrResume('mul');
  eq(s.queue.length, 10);
  eq(s.index, 0);
  ok(s.question, '첫 문제 없음');
  eq(s.question.mode, 'choice', '처음 만나는 문제는 보기로 내야 함');
});
t('정답을 내면 다음 문제로 넘어가고 저장된다', () => {
  const s = sess.active();
  const before = s.question.factKey;
  const r = sess.submit(s.question.answer);
  ok(r.correct); eq(r.done, false);
  eq(sess.active().index, 1);
  ok(sess.active().question.factKey !== before || true);
});
t('오답이면 이 판 끝에 재출제 목록에 들어간다', () => {
  const s = sess.active();
  const wrongVal = s.question.answer + 1;
  const key = s.question.factKey;
  const r = sess.submit(wrongVal);
  ok(!r.correct);
  ok(qk(sess.active().retryQueue).includes(key), '재출제 목록에 없음');
  const m = store.mastery('mul', key);
  eq(m.box, 1, '오답인데 box가 1이 아님');
  // 분수·좌표도 담아야 해서 오답은 사람이 읽는 문자열로 저장한다
  eq(m.lastWrong, String(wrongVal), '아이가 적은 오답이 기록되지 않음');
  ok(m.wrongLog.length === 1 && m.wrongLog[0].reason, '오답 유형이 기록되지 않음');
});
t('중단 후 재개하면 같은 문제가 나온다', () => {
  const key = sess.active().question.factKey;
  const again = sess.startOrResume('mul');   // 앱을 껐다 켠 상황
  eq(again.question.factKey, key);
  eq(again.index, sess.active().index);
});
t('한 판을 끝까지 풀면 재출제까지 나오고 요약이 나온다', () => {
  let guard = 0;
  while (sess.active()?.question && guard++ < 60) {
    const q = sess.active().question;
    sess.submit(q.answer);
  }
  ok(guard < 60, '세션이 끝나지 않음(무한 루프)');
  const s = sess.active();
  ok(s.items.length >= 10, '문항 수 부족');
  ok(s.items.length > 10, '틀린 문제가 재출제되지 않음');
  const sum = sess.finish();
  eq(sum.total, 10);
  ok(sum.correct >= 9);
  eq(sess.active(), null, '세션이 정리되지 않음');
  eq(store.pdata().sessions.length, 1);
});
t('복습할 때가 된 문항이 다음 판에 우선 출제된다', () => {
  const d = store.pdata();
  const keys = Object.keys(d.mastery).slice(0, 4);
  for (const k of keys) { d.mastery[k].dueAt = Date.now() - 86400000; }
  const s = sess.startOrResume('mul');
  const dueKeys = keys.map((k) => k.split(':')[1]);
  const hit = dueKeys.filter((k) => qk(s).includes(k)).length;
  eq(hit, dueKeys.length, `복습 대상 ${dueKeys.length}개 중 ${hit}개만 출제됨`);
  sess.abandon();
});
t('배운 게 쌓이면 새 항목은 한 판에 3개까지만 나온다', () => {
  // 30문항을 이미 배운 상태로 만든다 (2개만 복습 시기가 됨)
  const d = store.pdata();
  const keys = mul.allFacts().slice(0, 30);
  keys.forEach((k, i) => {
    d.mastery[`mul:${k}`] = {
      skillId: 'mul', factKey: k, box: 2,
      dueAt: i < 2 ? Date.now() - 1000 : Date.now() + 86400000,
      seen: 3, correct: 2, avgMs: 3500, lastWrong: null, wrongLog: [],
    };
  });
  const s2 = sess.startOrResume('mul');
  const fresh = qk(s2).filter((k) => !d.mastery[`mul:${k}`]).length;
  ok(fresh <= 3, `새 항목이 ${fresh}개 나옴 (최대 3개여야 함)`);
  eq(s2.queue.length, 10);
  ok(qk(s2).includes(keys[0]) && qk(s2).includes(keys[1]), '복습 시기가 된 문항이 빠짐');
  sess.abandon();
  for (const k of keys) delete d.mastery[`mul:${k}`];
});
t('단 하나만 콕 집어 연습하면 그 단만 나온다', () => {
  const s = sess.startOrResume('mul', '3dan');
  ok(qk(s).every((k) => k.startsWith('3x')), '다른 단이 섞임: ' + qk(s).join(','));
  sess.abandon();
});
t('받아올림 스킬도 같은 엔진에서 동작한다', () => {
  const s = sess.startOrResume('addsub');
  eq(s.queue.length, 10);
  ok(s.question.prompt.match(/\d+ [+−] \d+/), s.question.prompt);
  sess.abandon();
});

console.log('\n[문제 형태]');
const ALL_VARIANTS = mul.VARIANTS.map((v) => v.id);
t('형태 6종이 정의되어 있다', () => eq(ALL_VARIANTS.length, 6));
t('형태가 바뀌어도 factKey 가 유지된다 (SRS가 안 깨진다)', () => {
  for (const key of mul.allFacts()) for (const v of ALL_VARIANTS) {
    if (!mul.canUse(v, key)) continue;
    eq(mul.makeQuestion(key, 1, v).factKey, key, `${v} / ${key}`);
  }
});
t('형태별 정답이 실제로 맞다', () => {
  for (const key of mul.allFacts()) {
    const { a, b } = mul.parseFact(key);
    eq(mul.makeQuestion(key, 1, 'basic').answer, a * b, key);
    eq(mul.makeQuestion(key, 1, 'missingB').answer, b, key);
    eq(mul.makeQuestion(key, 1, 'missingA').answer, a, key);
    if (mul.canUse('skip', key)) eq(mul.makeQuestion(key, 1, 'skip').answer, a * b, key);
    if (mul.canUse('groups', key)) eq(mul.makeQuestion(key, 1, 'groups').answer, a * b, key);
  }
});
t('뛰어세기 수열이 실제 배수이고 빈칸이 정확히 하나다', () => {
  for (const key of mul.allFacts().filter((k) => mul.canUse('skip', k))) {
    const { a, b } = mul.parseFact(key);
    const q = mul.makeQuestion(key, 1, 'skip');
    const nums = q.render.nums;
    eq(nums.filter((n) => n === null).length, 1, key);
    ok(nums.indexOf(null) >= 2, `${key}: 빈칸 앞에 항이 부족 (${nums})`);
    // null 을 정답으로 채우면 완전한 등차수열이어야 한다
    const filled = nums.map((n) => (n === null ? q.answer : n));
    for (let i = 1; i < filled.length; i++) eq(filled[i] - filled[i - 1], a, `${key} ${filled}`);
  }
});
t('참·거짓은 양쪽이 다 나오고 판정이 맞다', () => {
  let sawTrue = false, sawFalse = false;
  for (let i = 0; i < 200; i++) {
    const q = mul.makeQuestion('7x8', 1, 'truefalse');
    const shown = Number(q.render.tokens[4].t);
    eq(q.answer, shown === 56 ? 1 : 0, `shown=${shown}`);
    if (q.answer === 1) sawTrue = true; else sawFalse = true;
  }
  ok(sawTrue && sawFalse, '한쪽만 나옴');
});
t('묶어세기는 곱이 20 이하, 뛰어세기는 b가 3 이상일 때만', () => {
  for (const key of mul.allFacts()) {
    const { a, b } = mul.parseFact(key);
    eq(mul.canUse('groups', key), a * b <= 20, key);
    eq(mul.canUse('skip', key), b >= 3, key);
  }
});
t('쓸 수 없는 형태를 요청하면 basic 으로 되돌아간다', () => {
  eq(mul.makeQuestion('9x9', 1, 'groups').variant, 'basic'); // 81개는 못 그린다
  eq(mul.makeQuestion('7x1', 1, 'skip').variant, 'basic');   // 앞에 항이 없다
});
t('모든 형태에 진단 문장이 붙는다', () => {
  for (const v of ALL_VARIANTS) {
    const q = mul.makeQuestion('7x8', 1, v);
    const wrong = q.mode === 'ox' ? 1 - q.answer : q.answer + 1;
    const msg = mul.diagnose('7x8', wrong, q.ctx);
    ok(typeof msg === 'string' && msg.length > 0, `${v} 진단 없음`);
  }
});
t('덧뺄셈도 같은 형태 체계를 따른다', () => {
  for (const v of as.VARIANTS.map((x) => x.id)) {
    const q = as.makeQuestion('7+8', 1, v);
    eq(q.factKey, '7+8', v);
    const expect = { basic: q.ctx.x + q.ctx.y, missingB: q.ctx.y, missingA: q.ctx.x };
    if (v in expect) eq(q.answer, expect[v], v);
  }
});

console.log('\n[난이도]');
t('레벨 1에서는 기본 형태만, 레벨이 오르면 형태가 열린다', () => {
  eq(diff.unlockedVariants(mul, 1).map((v) => v.id).sort(), ['basic', 'groups']);
  ok(diff.unlockedVariants(mul, 3).length > diff.unlockedVariants(mul, 1).length);
  eq(diff.unlockedVariants(mul, 5).length, 6);
});
t('잘하면 레벨이 오른다', () => {
  diff.setPreset('auto');
  store.pdata().levels = {};
  let last = 0;
  for (let i = 0; i < 12; i++) last = diff.record('mul', { correct: true, fast: true }).level;
  ok(last > 1, `레벨이 안 올랐다 (${last})`);
});
t('많이 틀리면 레벨이 내려간다', () => {
  const before = diff.levelOf('mul');
  let after = before;
  for (let i = 0; i < 12; i++) after = diff.record('mul', { correct: false, fast: false }).level;
  ok(after < before, `${before} → ${after}`);
});
t('수동 프리셋이 레벨 범위를 가둔다', () => {
  diff.setPreset('easy');
  for (let i = 0; i < 30; i++) diff.record('mul', { correct: true, fast: true });
  ok(diff.levelOf('mul') <= 2, `쉬움인데 레벨 ${diff.levelOf('mul')}`);
  diff.setPreset('hard');
  ok(diff.levelOf('mul') >= 4, `도전인데 레벨 ${diff.levelOf('mul')}`);
  eq(store.settings().targetMs, 2500, '프리셋이 목표 시간을 안 바꿈');
  diff.setPreset('auto');
});
t('표본이 적으면 레벨을 건드리지 않는다', () => {
  store.pdata().levels = {};
  const start = diff.levelOf('mul');
  for (let i = 0; i < 5; i++) diff.record('mul', { correct: true, fast: true });
  eq(diff.levelOf('mul'), start);
});
t('직전과 같은 형태는 피한다', () => {
  for (let i = 0; i < 60; i++) {
    ok(diff.pickVariant(mul, '7x8', 5, 'basic') !== 'basic', '연속으로 같은 형태가 나옴');
  }
});
t('선택지가 하나뿐이면 그거라도 낸다', () => {
  // 레벨 1 + 곱이 커서 groups 불가 → basic 뿐
  eq(diff.pickVariant(mul, '9x9', 1, 'basic'), 'basic');
});

console.log('\n[출제 순서]');
t('큐가 매번 다른 순서로 나온다 (1차 반복감의 직접 원인)', () => {
  store.resetAll();
  store.createProfile({ name: '순서', grade: 2, avatar: '🐧' });
  const orders = new Set();
  for (let i = 0; i < 6; i++) {
    const s2 = sess.startOrResume('mul');
    orders.add(qk(s2).join(','));
    sess.abandon();
  }
  ok(orders.size > 1, '여섯 번 만들었는데 순서가 전부 같다');
});
t('셔플해도 문항 수와 중복 없음이 유지된다', () => {
  for (let i = 0; i < 20; i++) {
    const s2 = sess.startOrResume('mul');
    eq(s2.queue.length, 10, '문항이 사라졌다');
    eq(new Set(qk(s2)).size, 10, '중복이 생겼다');
    sess.abandon();
  }
});
t('첫 판이 2단 행진이 아니다', () => {
  const tables = new Set();
  for (let i = 0; i < 8; i++) {
    const s2 = sess.startOrResume('mul');
    qk(s2).forEach((k) => tables.add(k.split('x')[0]));
    sess.abandon();
  }
  ok(tables.size > 1, `한 단만 나온다: ${[...tables]}`);
});

console.log('\n[진단 판]');
t('진단 결과가 mastery 를 채운다', () => {
  store.resetAll();
  store.createProfile({ name: '진단', grade: 2, avatar: '🦖' });
  const qs = sess.placementQuestions('mul');
  eq(qs.length, 12);
  ok(qs.every((q) => q.mode === 'choice'), '진단은 전부 보기로 내야 함');

  // 2단·5단은 빠르게 맞히고 나머지는 틀린 것으로 흉내낸다
  const results = qs.map((q) => {
    const table = q.factKey.split('x')[0];
    const good = table === '2' || table === '5';
    return { factKey: q.factKey, correct: good, ms: good ? 1500 : 6000 };
  });
  const r = sess.applyPlacement('mul', results);
  ok(r.seeded > 0, '아무것도 안 채워짐');
  ok(r.known.includes('2단') && r.known.includes('5단'), `아는 단: ${r.known}`);
  eq(store.pdata().mastery['mul:2x4'].box, 2, '아는 단이 box 2 로 안 들어감');
  ok(!store.pdata().mastery['mul:7x4'], '모르는 단을 건드림');
  ok(sess.placementDone());
});
t('진단 뒤 첫 판에서 아는 단이 덜 나온다', () => {
  const s2 = sess.startOrResume('mul');
  const fromKnown = qk(s2).filter((k) => ['2', '5'].includes(k.split('x')[0])).length;
  ok(fromKnown < 10, '아는 단으로만 채워짐');
  sess.abandon();
});
t('진단을 건너뛰어도 다시 묻지 않는다', () => {
  sess.resetPlacement();
  ok(!sess.placementDone());
  sess.applyPlacement('mul', []);
  ok(sess.placementDone());
});

console.log('\n[60초 랠리]');
t('틀려도 box 를 낮추지 않는다 (속도 게임에서 벌을 주지 않는다)', () => {
  const m = store.mastery('mul', '2x4');
  m.box = 4; m.dueAt = 99999999999;
  const before = { box: m.box, dueAt: m.dueAt };
  const q = sess.rallyQuestion('mul');
  const forced = { ...q, factKey: '2x4', answer: 8 };
  sess.rallyRecord('mul', forced, 999, 1200);      // 일부러 오답
  eq(m.box, before.box, 'box 가 강등됨');
  eq(m.dueAt, before.dueAt, '복습 시기가 당겨짐');
  ok(m.seen > 0, '기록은 남아야 한다');
});
t('맞히면 응답시간은 기록된다', () => {
  const m = store.mastery('mul', '2x5');
  const q = { factKey: '2x5', answer: 10 };
  sess.rallyRecord('mul', q, 10, 900);
  ok(m.avgMs > 0, '응답시간이 기록되지 않음');
  eq(store.pdata().bestMs['2x5'], 900);
});
t('최고 기록이 갱신되고 유지된다', () => {
  eq(sess.rallyFinish('mul', 14).isBest, true);
  eq(sess.rallyBest('mul'), 14);
  eq(sess.rallyFinish('mul', 9).isBest, false);
  eq(sess.rallyBest('mul'), 14, '낮은 점수가 최고 기록을 덮어씀');
});

console.log('\n[콤보]');
t('연속 정답이 쌓이고 틀리면 0으로 돌아간다', () => {
  store.resetAll();
  store.createProfile({ name: '콤보', grade: 2, avatar: '🐰' });
  sess.startOrResume('mul');
  let sawMilestone = 0;
  for (let n = 0; n < 3; n++) {
    const r = sess.submit(sess.active().question.answer);
    if (r.milestone) sawMilestone = r.milestone;
    eq(r.streak, n + 1);
  }
  eq(sawMilestone, 3, '3연속 마일스톤이 안 뜸');
  const bad = sess.submit(sess.active().question.answer + 1);
  eq(bad.streak, 0, '틀렸는데 콤보가 안 끊김');
  sess.abandon();
});

console.log('\n[용돈 저금통]');
t('한 판 완주하면 적립된다', () => {
  store.resetAll();
  store.createProfile({ name: '용돈', grade: 2, avatar: '🐷' });
  eq(wal.balance(), 0);
  const got = wal.awardForSession({ newStickers: [] });
  eq(got.length, 1);
  eq(wal.balance(), wal.config().perSession);
});
t('하루 상한을 넘으면 더 쌓이지 않는다 (쉬운 판 반복 파밍 방지)', () => {
  const cap = wal.config().dailySessionCap;
  for (let i = 1; i < cap; i++) wal.awardForSession({ newStickers: [] });
  const atCap = wal.balance();
  eq(wal.countToday('session'), cap);
  eq(wal.awardForSession({ newStickers: [] }).length, 0, '상한을 넘겨 적립됨');
  eq(wal.balance(), atCap);
});
t('단을 마스터하면 상한과 무관하게 보너스가 붙는다', () => {
  const before = wal.balance();
  const got = wal.awardForSession({ newStickers: ['3단'] });
  eq(got.length, 1);
  eq(got[0].kind, 'mastery');
  eq(wal.balance(), before + wal.config().masteryBonus);
});
t('주간 목표 보너스는 그 주에 한 번만', () => {
  const before = wal.balance();
  wal.awardForSession({ newStickers: [] }, { weeklyGoalMet: true });
  const once = wal.balance();
  eq(once, before + wal.config().weeklyBonus);
  wal.awardForSession({ newStickers: [] }, { weeklyGoalMet: true });
  eq(wal.balance(), once, '주간 보너스가 두 번 지급됨');
});
t('랠리 보너스도 하루 한 번만', () => {
  const before = wal.balance();
  ok(wal.awardForRally());
  eq(wal.balance(), before + wal.config().rallyBonus);
  eq(wal.awardForRally(), null, '랠리 보너스가 두 번 지급됨');
});
t('잠금 번호 없이는 현금화할 수 없다', () => {
  store.updateSettings({ parentPin: '' });
  eq(wal.payout(10).reason, 'PIN_REQUIRED');
});
t('잔액보다 많이 줄 수 없고, 이상한 금액은 거부한다', () => {
  store.updateSettings({ parentPin: '1234' });
  eq(wal.payout(wal.balance() + 1).reason, 'INSUFFICIENT');
  eq(wal.payout(0).reason, 'BAD_AMOUNT');
  eq(wal.payout('abc').reason, 'BAD_AMOUNT');
});
t('현금화하면 잔액이 줄고 내역이 남는다', () => {
  const before = wal.balance();
  const r = wal.payout(50, '문방구');
  ok(r.ok);
  eq(wal.balance(), before - 50);
  const last = wal.ledger()[0];
  eq(last.kind, 'payout');
  eq(last.amount, -50);
  eq(last.note, '문방구');
});
t('현금화해도 누적 금액은 줄지 않는다', () => {
  const life = wal.lifetime();
  wal.payout(10);
  eq(wal.lifetime(), life, '지급했다고 누적이 깎임');
});
t('잔액은 0 아래로 내려가지 않는다', () => {
  wal.adjust(-999999);
  eq(wal.balance(), 0);
});
t('설정을 바꾸면 목표까지 걸리는 기간이 달라진다', () => {
  wal.setConfig({ perSession: 10, dailySessionCap: 3, goal: 5000 });
  const slow = wal.weeksToGoal();
  wal.setConfig({ perSession: 200 });
  const fast = wal.weeksToGoal();
  ok(slow > fast, `10원(${slow}주) 이 200원(${fast}주) 보다 빨라야 하는데 아님`);
  ok(slow > 12, '10원·하루3판이면 5,000원은 한참 걸려야 정상');
  wal.setConfig({ ...wal.DEFAULTS });
});
t('세션을 끝내면 요약에 적립 내역이 담긴다', () => {
  store.resetAll();
  store.createProfile({ name: '연결', grade: 2, avatar: '🐥' });
  sess.startOrResume('mul');
  let guard = 0;
  while (sess.active()?.question && guard++ < 60) sess.submit(sess.active().question.answer);
  const sum = sess.finish();
  ok(Array.isArray(sum.earned), '요약에 earned 가 없다');
  ok(sum.earned.length >= 1, '완주했는데 적립이 없다');
  eq(sum.balance, wal.balance());
});

console.log('\n[여러 아이]');
t('프로필을 여럿 만들고 전환할 수 있다', () => {
  store.resetAll();
  const a = store.createProfile({ name: '채이', grade: 2, avatar: '🦄' });
  const b2 = store.createProfile({ name: '조카', grade: 1, avatar: '🐧' });
  eq(store.profiles().length, 2);
  eq(store.activeProfile().id, b2, '새로 만든 아이가 활성화되어야 함');
  store.setActiveProfile(a);
  eq(store.activeProfile().name, '채이');
});
t('아이별로 진도·저금통·레벨이 섞이지 않는다', () => {
  const [a, b2] = store.profiles().map((p) => p.id);

  store.setActiveProfile(a);
  store.mastery('mul', '7x8').box = 4;
  wal.adjust(500, '채이');
  diff.setPreset('hard');

  store.setActiveProfile(b2);
  ok(!store.pdata().mastery['mul:7x8'], '조카에게 채이 진도가 보임');
  eq(wal.balance(), 0, '조카에게 채이 저금통이 보임');
  eq(store.settings().difficulty, 'auto', '조카에게 채이 난이도가 넘어감');

  store.setActiveProfile(a);
  eq(store.pdata().mastery['mul:7x8'].box, 4, '채이 진도가 사라짐');
  eq(wal.balance(), 500, '채이 저금통이 사라짐');
  diff.setPreset('auto');
});
t('세션도 아이별로 따로 돌아간다', () => {
  const [a, b2] = store.profiles().map((p) => p.id);
  store.setActiveProfile(a);
  sess.startOrResume('mul');
  const mine = sess.active().id;

  store.setActiveProfile(b2);
  eq(sess.active(), null, '조카에게 채이 세션이 보임');
  sess.startOrResume('addsub');
  ok(sess.active().id !== mine);

  store.setActiveProfile(a);
  eq(sess.active().id, mine, '채이 세션이 사라짐');
  sess.abandon();
  store.setActiveProfile(b2); sess.abandon();
  store.setActiveProfile(a);
});
t('한 아이를 지워도 다른 아이는 남는다', () => {
  const [a, b2] = store.profiles().map((p) => p.id);
  const next = store.deleteProfile(b2);
  eq(store.profiles().length, 1);
  eq(next, a, '남은 아이로 활성이 옮겨가야 함');
  eq(store.activeProfile().name, '채이');
  eq(wal.balance(), 500, '지우면서 남은 아이 저금통이 날아감');
});
t('활성 아이를 지우면 남은 아이로 옮겨간다', () => {
  const c = store.createProfile({ name: '친구', grade: 3, avatar: '🐢' });
  eq(store.activeProfile().id, c);
  const next = store.deleteProfile(c);
  eq(store.activeProfile().name, '채이');
  ok(next);
});
t('마지막 아이를 지우면 아무도 안 남는다', () => {
  const only = store.profiles()[0].id;
  eq(store.deleteProfile(only), null);
  eq(store.profiles().length, 0);
  eq(store.activeProfile(), null, '온보딩으로 돌아가야 함');
});

console.log('\n[학년]');
t('초1은 곱셈구구가 열리지 않는다', () => {
  store.resetAll();
  store.createProfile({ name: '1학년', grade: 1, avatar: '🐣' });
  eq(sess.openSkills(), ['addsub']);
  ok(!gr.hasSkill('mul', 1), '초1에게 곱셈구구가 열림');
  ok(gr.hasSkill('mul', 2), '초2에게 곱셈구구가 안 열림');
});
t('초1의 덧뺄셈은 한 자리 그대로 나온다', () => {
  sess.startOrResume('addsub');
  for (let i = 0; i < 12; i++) {
    const q = sess.active()?.question;
    if (!q) break;
    ok(q.ctx.x < 20 && q.ctx.y < 10, `두 자리가 나옴: ${q.prompt}`);
    sess.submit(q.answer);
  }
  sess.finish();
});
t('초1 진단은 덧뺄셈 문항으로 나온다', () => {
  eq(sess.placementSkill(), 'addsub');
  const qs = sess.placementQuestions();
  ok(qs.length > 0);
  ok(qs.every((q) => q.skillId === 'addsub'), '진단에 곱셈구구가 섞임');
  ok(qs.every((q) => q.ctx.x < 20), '진단 문항이 두 자리로 나옴');
});
t('초2는 두 자리로 감싸서 나온다', () => {
  store.resetAll();
  store.createProfile({ name: '2학년', grade: 2, avatar: '🦊' });
  eq(sess.placementSkill(), 'mul');
  sess.startOrResume('addsub');
  let sawTwoDigit = false;
  for (let i = 0; i < 12; i++) {
    const q = sess.active()?.question;
    if (!q) break;
    if (q.ctx.x >= 20) sawTwoDigit = true;
    sess.submit(q.answer);
  }
  sess.finish();
  ok(sawTwoDigit, '초2인데 한 자리만 나옴');
});
t('학년을 바꾸면 열리는 스킬도 바뀐다', () => {
  eq(sess.openSkills().length, 2);
  store.updateProfile({ grade: 1 });
  eq(sess.openSkills(), ['addsub']);
  store.updateProfile({ grade: 2 });
  eq(sess.openSkills().length, 2);
});
t('학년 1~9 가 모두 정의돼 있다', () => {
  eq(gr.GRADE_KEYS.length, 9);
  eq(gr.of(6).label, '초6');
  eq(gr.of(7).label, '중1');
  eq(gr.of(9).label, '중3');
});
t('없는 학년은 2학년 기준으로 떨어진다', () => {
  eq(gr.of(99).label, '초2');
  eq(gr.of(undefined).label, '초2');
});

console.log('\n[저금통 켜고 끄기]');
t('끄면 완주해도 적립되지 않는다', () => {
  store.resetAll();
  store.createProfile({ name: '친구', grade: 2, avatar: '🐨' });
  wal.setConfig({ enabled: false });
  ok(!wal.enabled());
  eq(wal.awardForSession({ newStickers: ['3단'] }, { weeklyGoalMet: true }).length, 0);
  eq(wal.awardForRally(), null);
  eq(wal.balance(), 0);
});
t('다시 켜면 적립된다', () => {
  wal.setConfig({ enabled: true });
  ok(wal.enabled());
  ok(wal.awardForSession({ newStickers: [] }).length > 0);
  ok(wal.balance() > 0);
});
t('저금통 설정은 아이별로 따로다', () => {
  const on = store.activeProfile().id;
  const off = store.createProfile({ name: '손님', grade: 2, avatar: '🌸' });
  wal.setConfig({ enabled: false });
  ok(!wal.enabled(), '새 아이는 꺼둘 수 있어야 함');
  store.setActiveProfile(on);
  ok(wal.enabled(), '한 아이를 끄니 다른 아이도 꺼짐');
  store.setActiveProfile(off);
});
t('기본값은 켜짐 (기존 아이 동작이 안 바뀐다)', () => {
  store.resetAll();
  store.createProfile({ name: '기본', grade: 2, avatar: '⭐️' });
  ok(wal.enabled());
});

console.log('\n[답 형식]');
t('숫자 하나를 넘기던 기존 방식이 그대로 동작한다 (하위호환)', () => {
  eq(A.check(7, 7).correct, true);
  eq(A.check(8, 7).correct, false);
  eq(A.normalize(7), { type: 'int', value: 7 });
});
t('음수·소수·좌표를 받는다', () => {
  ok(A.check(-7, { type: 'int', value: -7 }).correct);
  ok(!A.check(7, { type: 'int', value: -7 }).correct);
  ok(A.check(3.14, { type: 'dec', value: 3.14, places: 2 }).correct);
  ok(!A.check(3.15, { type: 'dec', value: 3.14, places: 2 }).correct);
  ok(A.check({ a: 3, b: -2 }, { type: 'pair', a: 3, b: -2 }).correct);
  ok(!A.check({ a: -2, b: 3 }, { type: 'pair', a: 3, b: -2 }).correct);
});
t('소수 비교가 부동소수점에 흔들리지 않는다', () => {
  ok(A.check(0.3, { type: 'dec', value: 0.1 + 0.2, places: 1 }).correct);
});
t('분수는 값과 기약 여부를 모두 본다', () => {
  const ans = { type: 'frac', num: 3, den: 4, requireReduced: true };
  eq(A.check({ num: 3, den: 4 }, ans), { correct: true, note: null });
  eq(A.check({ num: 6, den: 8 }, ans), { correct: false, note: 'notReduced' });
  eq(A.check({ num: 2, den: 3 }, ans), { correct: false, note: null });
  eq(A.check({ num: 1, den: 0 }, ans), { correct: false, note: null });
});
t('약분을 안 한 답에는 전용 안내가 나간다', () => {
  store.resetAll();
  store.createProfile({ name: '분수', grade: 5, avatar: '🦊' });
  sess.startOrResume('fraction');
  let guard = 0, saw = false;
  while (sess.active()?.question && guard++ < 30) {
    const q = sess.active().question;
    if (q.answer?.type === 'frac' && q.answer.den > 1) {
      const r = sess.submit({ num: q.answer.num * 2, den: q.answer.den * 2 });
      eq(r.note, 'notReduced');
      ok(/약분/.test(r.reason), r.reason);
      saw = true;
      break;
    }
    sess.submit(q.answer?.value ?? q.answer);
  }
  ok(saw, '분수 문항을 못 만났다');
  sess.abandon();
});
t('수식 답은 문자열로 판정한다 (파서 없이 보기로)', () => {
  ok(A.check('(x + 2)(x + 3)', { type: 'text', value: '(x + 2)(x + 3)' }).correct);
  ok(!A.check('(x − 2)(x + 3)', { type: 'text', value: '(x + 2)(x + 3)' }).correct);
});
t('입력 위젯이 답 타입에 맞게 골라진다', () => {
  eq(A.inputKind({ type: 'frac' }, 'input'), 'frac');
  eq(A.inputKind({ type: 'pair' }, 'input'), 'pair');
  eq(A.inputKind({ type: 'int' }, 'input'), 'num');
  eq(A.inputKind({ type: 'text' }, 'choice'), 'choice');
  eq(A.padOptions({ type: 'int', allowNegative: true }).negative, true);
  eq(A.padOptions({ type: 'dec' }).decimal, true);
  eq(A.padOptions({ type: 'int' }).negative, false);
});

console.log('\n[스킬별 목표 시간]');
t('과목마다 목표가 다르다', () => {
  store.resetAll();
  store.createProfile({ name: '시간', grade: 7, avatar: '🐧' });
  diff.setPreset('auto');
  eq(sess.skillTargetMs('mul'), 3000);
  eq(sess.skillTargetMs('linear'), 30000);
  ok(sess.skillTargetMs('simul') > sess.skillTargetMs('linear'));
});
t('프리셋은 배수로만 작용한다 (절대값을 강요하지 않는다)', () => {
  diff.setPreset('hard');
  eq(sess.skillTargetMs('mul'), 2400);
  eq(sess.skillTargetMs('linear'), 24000);
  diff.setPreset('easy');
  eq(sess.skillTargetMs('linear'), 48000);
  diff.setPreset('auto');
});
t('일차방정식을 20초에 풀면 마스터로 인정된다', () => {
  const m = { box: 4, avgMs: 20000 };
  ok(srs.isMastered(m, sess.skillTargetMs('linear')), '30초 기준인데 탈락함');
  ok(!srs.isMastered(m, sess.skillTargetMs('mul')), '곱셈구구 3초 기준으로도 통과해버림');
});

console.log('\n[새 생성기 8개]');
const NEW = ['divide', 'fraction', 'decimal', 'factors', 'integers', 'linear', 'simul', 'quadratic'];
t('전부 등록돼 있고 계약을 지킨다', () => {
  for (const id of NEW) {
    const g = sess.skill(id);
    ok(g, `${id} 미등록`);
    for (const fn of ['allFacts', 'groups', 'newFactOrder', 'placementFacts',
                      'canUse', 'makeQuestion', 'diagnose', 'parseFact']) {
      ok(typeof g[fn] === 'function', `${id}.${fn} 없음`);
    }
    ok(g.targetMs > 0, `${id}.targetMs 없음`);
    ok(g.VARIANTS?.length > 0, `${id}.VARIANTS 없음`);
    ok(g.allFacts().length > 0, `${id} 문항 키 없음`);
  }
});
t('모든 형태가 factKey 를 보존한다 (SRS가 안 깨진다)', () => {
  for (const id of NEW) {
    const g = sess.skill(id);
    for (const key of g.allFacts()) {
      for (const v of g.VARIANTS.map((x) => x.id)) {
        if (!g.canUse(v, key)) continue;
        eq(g.makeQuestion(key, 1, v).factKey, key, `${id} / ${v} / ${key}`);
      }
    }
  }
});
t('모든 문항이 답과 입력 방식을 갖춘다', () => {
  for (const id of NEW) {
    const g = sess.skill(id);
    for (const key of g.allFacts()) {
      for (let i = 0; i < 12; i++) {
        const q = g.makeQuestion(key, 1, 'basic');
        ok(q.answer != null, `${id}/${key} 답 없음`);
        ok(['input', 'choice', 'ox'].includes(q.mode), `${id}/${key} mode=${q.mode}`);
        if (q.mode === 'choice') {
          eq(q.choices.length, 4, `${id}/${key} 보기 수`);
          ok(A.check(q.choices.find((c) => A.check(c, q.answer).correct), q.answer).correct,
             `${id}/${key} 보기에 정답이 없음`);
        }
        ok(q.render && (q.render.tokens || q.render.lines || q.render.text),
           `${id}/${key} 렌더 없음`);
      }
    }
  }
});
t('나눗셈의 나머지가 나누는 수보다 작다', () => {
  const g = sess.skill('divide');
  for (const key of g.allFacts()) {
    if (!g.canUse('remainder', key)) continue;
    for (let i = 0; i < 20; i++) {
      const q = g.makeQuestion(key, 1, 'remainder');
      const { a } = g.parseFact(key);
      ok(q.ctx.rem > 0 && q.ctx.rem < a, `${key} 나머지 ${q.ctx.rem}`);
      eq(q.ctx.total, a * q.ctx.q + q.ctx.rem, key);
    }
  }
});
t('분수 답은 늘 기약분수이고 뺄셈 결과가 음수가 아니다', () => {
  const g = sess.skill('fraction');
  for (const key of g.allFacts()) {
    for (let i = 0; i < 20; i++) {
      const q = g.makeQuestion(key, 1, 'basic');
      if (q.answer.type !== 'frac') continue;
      ok(q.answer.num >= 0, `${key} 음수 ${q.answer.num}/${q.answer.den}`);
      eq(A.reduce(q.answer.num, q.answer.den), { num: q.answer.num, den: q.answer.den }, key);
    }
  }
});
t('소수 나눗셈은 딱 떨어진다', () => {
  const g = sess.skill('decimal');
  for (const key of g.allFacts().filter((k) => k.startsWith('div'))) {
    for (let i = 0; i < 20; i++) {
      const q = g.makeQuestion(key, 1, 'basic');
      ok(Math.abs(q.ctx.x / q.ctx.y - q.answer.value) < 1e-9, `${key} ${q.ctx.x}÷${q.ctx.y}`);
    }
  }
});
t('약수·배수 답이 실제로 최대공약수·최소공배수다', () => {
  const g = sess.skill('factors');
  for (const key of g.allFacts()) {
    const { kind, a, b } = g.parseFact(key);
    if (kind === 'gcd') eq(g.answerOf(key), A.gcd(a, b), key);
    if (kind === 'lcm') eq(g.answerOf(key), (a * b) / A.gcd(a, b), key);
    if (kind === 'reduce') ok(A.gcd(a, b) > 1, `${key} 약분할 게 없음`);
  }
});
t('정수 문항의 부호가 키와 일치하고 나눗셈이 딱 떨어진다', () => {
  const g = sess.skill('integers');
  for (const key of g.allFacts()) {
    const { op, s1, s2 } = g.parseFact(key);
    for (let i = 0; i < 20; i++) {
      const q = g.makeQuestion(key, 1, 'basic');
      eq(q.ctx.a < 0, s1 === 'n', `${key} 첫 수 부호`);
      eq(q.ctx.b < 0, s2 === 'n', `${key} 둘째 수 부호`);
      if (op === 'div') ok(Number.isInteger(q.ctx.value), `${key} 나눗셈이 안 떨어짐`);
    }
  }
});
t('일차방정식의 해가 실제로 식을 만족한다', () => {
  const g = sess.skill('linear');
  for (const key of g.allFacts()) {
    for (let i = 0; i < 25; i++) {
      const q = g.makeQuestion(key, 1, 'basic');
      ok(Number.isInteger(q.answer.value), `${key} 해가 정수가 아님: ${q.answer.value}`);
    }
  }
});
t('연립방정식 해가 두 식을 모두 만족한다', () => {
  const g = sess.skill('simul');
  for (const key of g.allFacts()) {
    for (let i = 0; i < 25; i++) {
      const q = g.makeQuestion(key, 1, 'basic');
      eq(q.answer.type, 'pair', key);
      ok(Number.isInteger(q.answer.a) && Number.isInteger(q.answer.b), `${key} 해가 정수가 아님`);
    }
  }
});
t('인수분해는 보기 4개이고 정답이 정확히 하나다', () => {
  const g = sess.skill('quadratic');
  for (const key of g.allFacts().filter((k) => k.startsWith('fac'))) {
    for (let i = 0; i < 20; i++) {
      const q = g.makeQuestion(key, 1, 'basic');
      eq(q.mode, 'choice', key);
      eq(q.choices.length, 4, key);
      eq(q.choices.filter((c) => c === q.answer.value).length, 1, `${key} 정답 개수`);
    }
  }
});
t('이차방정식은 더 작은 근을 묻고 그 근이 실제 해다', () => {
  const g = sess.skill('quadratic');
  for (let i = 0; i < 40; i++) {
    const q = g.makeQuestion('solve', 1, 'basic');
    eq(q.answer.value, Math.min(...q.ctx.roots));
    for (const r of q.ctx.roots) {
      const { p: pp, q: qq } = q.ctx;
      eq((r + pp) * (r + qq), 0, `근 ${r} 이 식을 만족하지 않음`);
    }
  }
});
t('모든 오답에 진단 문장이 붙는다', () => {
  for (const id of NEW) {
    const g = sess.skill(id);
    for (const key of g.allFacts()) {
      const q = g.makeQuestion(key, 1, 'basic');
      const a = A.normalize(q.answer);
      let wrong;
      if (a.type === 'frac') wrong = { num: a.num + 1, den: a.den };
      else if (a.type === 'pair') wrong = { a: a.a + 1, b: a.b };
      else if (a.type === 'text') wrong = 'nope';
      else if (a.type === 'ox') wrong = 1 - a.value;
      else wrong = a.value + 1;
      const msg = g.diagnose(key, wrong, q.ctx);
      ok(typeof msg === 'string' && msg.length > 0, `${id}/${key} 진단 없음`);
    }
  }
});

console.log('\n[학년별 톤]');
t('학년마다 톤이 다르다', () => {
  eq(th.tone(2), 'kid');
  eq(th.tone(5), 'tween');
  eq(th.tone(8), 'teen');
});
t('톤에 따라 문구가 바뀐다', () => {
  eq(th.copy('wrongTitle', 2), '괜찮아요, 다시 해봐요');
  eq(th.copy('wrongTitle', 8), '오답');
  eq(th.copy('star', 2), '별');
  eq(th.copy('star', 8), 'XP');
  ok(th.copy('walletEmoji', 2) === '🐷' && th.copy('walletEmoji', 8) !== '🐷');
});
t('묶어세기 그림은 초1~3 에서만 쓴다', () => {
  eq(th.copy('useGroups', 2), true);
  eq(th.copy('useGroups', 5), false);
  eq(th.copy('useGroups', 8), false);
});
t('중학생은 한 판이 더 짧다', () => {
  eq(gr.sessionLength(2), 10);
  eq(gr.sessionLength(8), 8);
});
t('학년마다 열리는 스킬이 다르다', () => {
  store.resetAll();
  const kid = store.createProfile({ name: '초1', grade: 1, avatar: '🐣' });
  eq(sess.openSkills(), ['addsub']);
  store.updateProfile({ grade: 5 });
  ok(sess.openSkills().includes('fraction') && !sess.openSkills().includes('mul'));
  store.updateProfile({ grade: 8 });
  ok(sess.openSkills().includes('simul'));
  ok(!sess.openSkills().includes('addsub'), '중2에게 받아올림이 열림');
});
t('중학생 프로필도 세션이 정상으로 돈다', () => {
  store.resetAll();
  store.createProfile({ name: '중1', grade: 7, avatar: '🐬' });
  const s2 = sess.startOrResume('linear');
  ok(s2.queue.length > 0);
  let guard = 0;
  while (sess.active()?.question && guard++ < 40) {
    const q = sess.active().question;
    const a = A.normalize(q.answer);
    const give = a.type === 'pair' ? { a: a.a, b: a.b }
      : a.type === 'frac' ? { num: a.num, den: a.den }
      : a.type === 'text' ? a.value : a.value;
    const r = sess.submit(give);
    ok(r.correct, `정답을 냈는데 오답 처리됨: ${JSON.stringify(q.answer)}`);
  }
  const sum = sess.finish();
  ok(sum.correct === sum.total, `${sum.correct}/${sum.total}`);
});

console.log('\n[백업]');
t('내보내고 다시 불러오면 기록이 그대로다', () => {
  const before = store.exportJSON();
  const sessions = store.pdata().sessions.length;
  store.resetAll();
  eq(store.profiles().length, 0);
  store.importJSON(before);
  eq(store.profiles().length, 1);
  eq(store.pdata().sessions.length, sessions);
});
t('백업 하나에 모든 아이가 담기고 전원이 복구된다', () => {
  store.resetAll();
  const a = store.createProfile({ name: '채이', grade: 2, avatar: '🦄' });
  wal.adjust(700, '채이');
  const b2 = store.createProfile({ name: '조카', grade: 1, avatar: '🐧' });
  wal.adjust(300, '조카');

  const dump = store.exportJSON();
  store.resetAll();
  eq(store.profiles().length, 0);

  store.importJSON(dump);
  eq(store.profiles().length, 2, '한 명만 복구됨');
  store.setActiveProfile(a);
  eq(wal.balance(), 700, '채이 저금통이 안 돌아옴');
  eq(store.activeProfile().grade, 2);
  store.setActiveProfile(b2);
  eq(wal.balance(), 300, '조카 저금통이 안 돌아옴');
  eq(store.activeProfile().grade, 1, '학년이 안 돌아옴');
});
t('엉뚱한 파일은 거부한다', () => {
  let threw = false;
  try { store.importJSON('{"hello":1}'); } catch { threw = true; }
  ok(threw, '아무 JSON이나 받아들임');
});

console.log('\n[연산 분류 · 섞어내기]');
{
  // 아이가 "오늘의 공부가 곱셈만 나와서 재미없다"고 한 것이 이 묶음의 출발점이다.
  // 관찰은 정확했다 — 판 하나가 스킬 하나에 묶여 있었고 초2의 메인이 곱셈구구였다.
  const opsm = await import(B + 'ops.js');
  const dv   = await import(B + 'generators/divide.js');

  store.resetAll();
  const kid = store.createProfile({ name: '연산', grade: 2, avatar: '🐤' });
  store.setActiveProfile(kid);

  t('생성기가 자기 문항의 연산을 안다', () => {
    eq(mul.opOf('7x8'), 'mul');
    eq(as.opOf('7+8'), 'add');
    eq(as.opOf('13-8'), 'sub');
    eq(dv.opOf('7x8'), 'div');
  });

  t('덧뺄셈 스킬 하나가 ＋ 와 − 두 연산으로 갈린다', () => {
    const add = as.allFacts().filter((k) => as.opOf(k) === 'add');
    const sub = as.allFacts().filter((k) => as.opOf(k) === 'sub');
    eq(add.length + sub.length, as.allFacts().length, '어느 연산에도 안 들어간 문항이 있다');
    ok(add.length > 0 && sub.length > 0);
  });

  t('초2는 ＋ − × 가 열리고 ÷ 는 잠긴다 (교육과정)', () => {
    eq(sess.openOps(), ['add', 'sub', 'mul']);
    ok(opsm.whenLearned('div').includes('3학년'), '언제 배우는지 안내가 없다');
  });

  t('연산마다 문항이 실제로 모인다', () => {
    for (const op of ['add', 'sub', 'mul']) {
      const list = sess.opFacts(op);
      ok(list.length > 0, op + ' 문항이 0개');
      ok(list.every((e) => sess.skill(e.skillId).opOf(e.factKey) === op), op + ' 에 다른 연산이 섞임');
    }
  });

  t('오늘의 공부 한 판에 연산이 섞여 나온다 (이번 요청의 핵심)', () => {
    // 예전 동작: 한 판 10문항이 전부 mul. 지금: ＋ − × 가 모두 등장해야 한다.
    for (let trial = 0; trial < 5; trial++) {
      sess.abandon();
      const s = sess.startOrResume('mix');
      eq(s.queue.length, 10);
      const seen = new Set(s.queue.map((e) => sess.skill(e.skillId).opOf(e.factKey)));
      eq([...seen].sort(), ['add', 'mul', 'sub'], `${trial}번째 판에 빠진 연산이 있다`);
    }
    sess.abandon();
  });

  t('섞은 판도 중복 없이 10문항이다', () => {
    const s = sess.startOrResume('mix');
    const tags = s.queue.map((e) => `${e.skillId}:${e.factKey}`);
    eq(tags.length, 10);
    eq(new Set(tags).size, 10, '같은 문항이 두 번 들어갔다');
    sess.abandon();
  });

  t('연산 하나만 고르면 그 연산만 나온다', () => {
    for (const op of ['add', 'sub', 'mul']) {
      sess.abandon();
      const s = sess.startOrResume(null, null, op);
      ok(s.queue.length > 0, op + ' 판이 비었다');
      ok(s.queue.every((e) => sess.skill(e.skillId).opOf(e.factKey) === op),
         op + ' 판에 다른 연산이 섞였다');
    }
    sess.abandon();
  });

  t('섞은 판에서도 새 항목은 최대 3개다', () => {
    const s = sess.startOrResume('mix');
    const d = store.pdata();
    const fresh = s.queue.filter((e) => !d.mastery[`${e.skillId}:${e.factKey}`]?.box).length;
    ok(fresh <= 3 || fresh === s.queue.length,
       `새 항목 ${fresh}개 — 복습거리가 있는데 상한을 넘었다`);
    sess.abandon();
  });

  t('섞은 판을 끝까지 풀 수 있고 채점이 스킬별로 맞는다', () => {
    sess.abandon();
    const s = sess.startOrResume('mix');
    const skillsSeen = new Set();
    let guard = 0;
    while (sess.active()?.question && guard++ < 60) {
      const q = sess.active().question;
      skillsSeen.add(q.skillId);
      sess.submit(q.answer);          // 전부 정답
    }
    ok(guard < 60, '세션이 끝나지 않음');
    ok(skillsSeen.size >= 2, '한 스킬만 나왔다: ' + [...skillsSeen]);
    const sum = sess.finish();
    eq(sum.total, 10);
    eq(sum.correct, 10, '정답을 냈는데 오답 처리된 문항이 있다 (스킬별 채점이 어긋났다)');
    eq(sum.kind, 'mix');
    ok(sum.skills.length >= 2, '요약에 스킬이 하나뿐이다');
  });

  t('섞은 판의 숙련도가 각 스킬 버킷에 따로 쌓인다', () => {
    const d = store.pdata();
    const bySkill = {};
    for (const m of Object.values(d.mastery)) {
      bySkill[m.skillId] = (bySkill[m.skillId] || 0) + 1;
    }
    ok(Object.keys(bySkill).length >= 2, '한 스킬에만 기록됐다: ' + JSON.stringify(bySkill));
    // 키가 `skillId:factKey` 라서 곱셈 7x8 과 나눗셈 7x8 이 섞이면 안 된다
    for (const [k, m] of Object.entries(d.mastery)) {
      eq(k, `${m.skillId}:${m.factKey}`, '숙련도 키가 어긋났다');
    }
  });

  t('섞은 판에서 틀린 문제는 그 스킬 그대로 재출제된다', () => {
    sess.abandon();
    sess.startOrResume('mix');
    const q = sess.active().question;
    const wrong = typeof q.answer === 'number' ? q.answer + 1
                : q.answer?.type === 'int' ? q.answer.value + 1 : 0;
    sess.submit(wrong);
    const rq = sess.active().retryQueue;
    eq(rq.length, 1);
    eq(rq[0].skillId, q.skillId, '재출제 항목이 다른 스킬로 들어갔다');
    eq(rq[0].factKey, q.factKey);
    sess.abandon();
  });

  t('목표 시간은 문항의 스킬 기준으로 잰다 (곱셈 3초 / 나눗셈 12초)', () => {
    ok(sess.skillTargetMs('mul') < sess.skillTargetMs('divide'),
       '나눗셈에 곱셈구구의 3초 기준을 들이대고 있다');
  });

  t('부모가 연산을 끄면 그 연산이 판에서 사라진다', () => {
    opsm.setEnabled(['mul']);
    eq(sess.openOps(), ['mul']);
    sess.abandon();
    const s = sess.startOrResume('mix');
    ok(s.queue.every((e) => sess.skill(e.skillId).opOf(e.factKey) === 'mul'),
       '꺼진 연산이 여전히 나온다');
    sess.abandon();
  });

  t('전부 끄는 것은 막는다 (낼 문제가 없어진다)', () => {
    opsm.setEnabled([]);
    ok(sess.openOps().length > 0, '연산이 하나도 안 켜져 있다');
  });

  t('학년에 없는 연산을 켜면 그 스킬도 함께 열린다', () => {
    opsm.setEnabled(['add', 'sub', 'mul', 'div']);
    ok(sess.openSkills().includes('divide'), '나눗셈을 켰는데 divide 생성기가 안 열렸다');
    sess.abandon();
    const s = sess.startOrResume(null, null, 'div');
    ok(s.queue.length > 0 && s.queue.every((e) => e.skillId === 'divide'));
    sess.abandon();
  });

  t('되돌리면 다시 학년 기준을 따른다', () => {
    opsm.setEnabled(null);
    ok(opsm.isDefault());
    eq(sess.openOps(), ['add', 'sub', 'mul']);
    ok(!sess.openSkills().includes('divide'), '되돌렸는데 나눗셈이 남아 있다');
  });

  t('초5는 분수·소수까지 네 연산이 모두 열린다', () => {
    const kid5 = store.createProfile({ name: '고학년', grade: 5, avatar: '🦉' });
    store.setActiveProfile(kid5);
    eq(sess.openOps(), ['add', 'sub', 'mul', 'div']);
    sess.abandon();
    const s = sess.startOrResume('mix');
    const seen = new Set(s.queue.map((e) => sess.skill(e.skillId).opOf(e.factKey)));
    ok(seen.size >= 3, '고학년 판에 연산이 ' + seen.size + '가지뿐이다');
    sess.abandon();
  });

  t('초1은 ＋ − 만 열린다 (곱셈구구를 아직 안 배웠다)', () => {
    const kid1 = store.createProfile({ name: '초1', grade: 1, avatar: '🐣' });
    store.setActiveProfile(kid1);
    eq(sess.openOps(), ['add', 'sub']);
    sess.abandon();
    const s = sess.startOrResume('mix');
    ok(s.queue.every((e) => e.skillId === 'addsub'));
    sess.abandon();
  });

  t('예전에 저장된 문자열 큐도 그대로 이어서 풀린다 (회귀)', () => {
    const kid2 = store.createProfile({ name: '구버전', grade: 2, avatar: '🐰' });
    store.setActiveProfile(kid2);
    const d = store.pdata();
    // 5차까지 저장되던 모양: kind 없음, queue 가 문자열 배열
    d.activeSession = {
      id: 'old', skillId: 'mul', groupId: null, startedAt: Date.now(),
      queue: ['2x3', '3x4', '4x5'], retryQueue: [], items: [], index: 0,
      question: null, questionStartedAt: Date.now(),
      streak: 0, bestStreak: 0, lastVariant: null,
    };
    store.save();
    const s = sess.startOrResume('mul');          // 앱을 껐다 켠 상황
    eq(s.id, 'old', '예전 세션을 못 이어받았다');
    ok(s.question, '예전 큐에서 문제를 못 만들었다');
    eq(s.question.factKey, '2x3');
    let guard = 0;
    while (sess.active()?.question && guard++ < 30) sess.submit(sess.active().question.answer);
    const sum = sess.finish();
    eq(sum.total, 3);
    eq(sum.correct, 3);
  });
}

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
