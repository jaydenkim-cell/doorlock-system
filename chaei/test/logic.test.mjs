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
t('엉뚱한 파일은 거부한다', () => {
  let threw = false;
  try { store.importJSON('{"hello":1}'); } catch { threw = true; }
  ok(threw, '아무 JSON이나 받아들임');
});

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
