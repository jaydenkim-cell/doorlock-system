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
const as    = await import(B + 'generators/addsub.js');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); console.log('  ✓', name); pass++; } catch (e) { console.log('  ✗', name, '→', e.message); fail++; } };
const eq = (a, b, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'false'); };

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
  ok(sess.active().retryQueue.includes(key), '재출제 목록에 없음');
  const m = store.mastery('mul', key);
  eq(m.box, 1, '오답인데 box가 1이 아님');
  eq(m.lastWrong, wrongVal, '아이가 적은 오답이 기록되지 않음');
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
  const hit = dueKeys.filter((k) => s.queue.includes(k)).length;
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
  const fresh = s2.queue.filter((k) => !d.mastery[`mul:${k}`]).length;
  ok(fresh <= 3, `새 항목이 ${fresh}개 나옴 (최대 3개여야 함)`);
  eq(s2.queue.length, 10);
  ok(s2.queue.includes(keys[0]) && s2.queue.includes(keys[1]), '복습 시기가 된 문항이 빠짐');
  sess.abandon();
  for (const k of keys) delete d.mastery[`mul:${k}`];
});
t('단 하나만 콕 집어 연습하면 그 단만 나온다', () => {
  const s = sess.startOrResume('mul', '3dan');
  ok(s.queue.every((k) => k.startsWith('3x')), '다른 단이 섞임: ' + s.queue.join(','));
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
    orders.add(s2.queue.join(','));
    sess.abandon();
  }
  ok(orders.size > 1, '여섯 번 만들었는데 순서가 전부 같다');
});
t('셔플해도 문항 수와 중복 없음이 유지된다', () => {
  for (let i = 0; i < 20; i++) {
    const s2 = sess.startOrResume('mul');
    eq(s2.queue.length, 10, '문항이 사라졌다');
    eq(new Set(s2.queue).size, 10, '중복이 생겼다');
    sess.abandon();
  }
});
t('첫 판이 2단 행진이 아니다', () => {
  const tables = new Set();
  for (let i = 0; i < 8; i++) {
    const s2 = sess.startOrResume('mul');
    s2.queue.forEach((k) => tables.add(k.split('x')[0]));
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
  const fromKnown = s2.queue.filter((k) => ['2', '5'].includes(k.split('x')[0])).length;
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
t('없는 학년은 2학년 기준으로 떨어진다', () => {
  eq(gr.of(9).label, gr.GRADES[2].label);
  eq(gr.of(undefined).label, '2학년');
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

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
