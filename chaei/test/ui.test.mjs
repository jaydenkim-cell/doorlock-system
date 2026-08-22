/**
 * 브라우저 시나리오 테스트
 *   python3 -m http.server 7777  로 서버를 띄운 뒤
 *   CHROMIUM=<크로미움경로> node chaei/test/ui.test.mjs /tmp/shots
 *
 * 단일 파일 빌드(dist/chaei-standalone.html)를 검증할 때는 BUNDLE=1 을 준다.
 * manifest·서비스워커·오프라인 3개는 단일 파일에 해당 없는 항목이라 건너뛴다.
 * 나머지 시나리오는 그대로 돌아야 한다 — 번들이 원본과 다르게 동작하면 안 되므로.
 *
 * 문제 형태가 6종이라 화면을 파싱해서 정답을 알아내지 않는다.
 * window.__chaei 로 현재 문항을 읽어서 형태에 맞는 방식으로 답한다.
 */
import { chromium } from 'playwright';
const SHOT = process.argv[2] || '/tmp/chaei-shots';
await (await import('node:fs/promises')).mkdir(SHOT, { recursive: true });
const URL = process.env.APP_URL || 'http://localhost:7777/chaei/';
const BUNDLE = !!process.env.BUNDLE;
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

// 미리 설치된 Chromium 을 쓰려면 CHROMIUM 환경변수로 경로를 준다
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await b.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
const shot = async (name, full = false) => {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: full });
};

const current = () => page.evaluate(() => window.__chaei.store.pdata().activeSession?.question || null);

/** 현재 문항에 답한다. wrong=true 면 일부러 틀린다. */
async function answerCurrent({ wrong = false } = {}) {
  const q = await current();
  if (!q) return null;
  if (q.mode === 'ox') {
    const want = wrong ? 1 - q.answer : q.answer;
    await page.locator(want === 1 ? '.ox-o' : '.ox-x').click();
  } else if (q.mode === 'choice') {
    const want = wrong
      ? q.choices.find((c) => c !== q.answer)
      : q.answer;
    await page.locator('.choice', { hasText: new RegExp(`^${want}$`) }).first().click();
  } else {
    const want = wrong ? q.answer + 1 : q.answer;
    for (const ch of String(want)) await page.locator(`.pad-key[aria-label="${ch}"]`).click();
    await page.locator('.pad-ok').click();
  }
  return q;
}

/** 정오답 알림을 닫는다 (오답은 버튼, 정답은 자동으로 사라진다) */
async function clearFlash() {
  const noBtn = page.locator('.flash.no button');
  await page.locator('.flash').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  if (await noBtn.count()) await noBtn.click();
  else await page.waitForTimeout(1300);
}

await page.goto(URL, { waitUntil: 'networkidle' });

console.log('\n[첫 실행]');
ok(await page.locator('text=반가워요!').isVisible(), '온보딩 화면이 뜬다');
await shot('1-onboard');
await page.locator('button[aria-label="🦄"]').click();
await page.locator('button:has-text("시작하기")').click();

console.log('\n[실력 진단]');
await page.waitForSelector('.q');
ok(await page.locator('text=어디까지 아는지').isVisible(), '온보딩 다음에 진단 판이 나온다');
ok((await page.locator('.choice').count()) === 4, '진단은 부담 없이 보기 4개로 낸다');
await shot('2-placement');

// 2단·5단만 맞히고 나머지는 틀린 아이를 흉내낸다
for (let i = 0; i < 12; i++) {
  const txt = await page.locator('.q .expr').textContent();
  const [a, bb] = txt.match(/(\d+)\D+(\d+)/).slice(1).map(Number);
  const knows = a === 2 || a === 5;
  const want = knows ? a * bb : a * bb + 1;
  const target = page.locator('.choice', { hasText: new RegExp(`^${want}$`) });
  if (await target.count()) await target.first().click();
  else await page.locator('.choice').first().click();
  await page.waitForTimeout(120);
}
await page.waitForSelector('text=다 했어요!');
ok(await page.locator('text=이미 잘 아는 단').isVisible(), '아는 단을 짚어준다');
const known = await page.locator('.card:has-text("이미 잘 아는 단")').textContent();
ok(/2단|5단/.test(known), `맞힌 단을 알아본다 → ${known.replace(/\s+/g, ' ').trim()}`);
await shot('3-placement-result');
await page.locator('button:has-text("시작하기")').click();

console.log('\n[홈]');
await page.waitForSelector('.map');
ok(await page.locator('text=채이 어린이').isVisible(), '이름이 보인다');
ok((await page.locator('.tile').count()) >= 8, '구구단 지도 8칸');
ok(await page.locator('text=이번 주').isVisible(), '주간 도장');
ok(await page.locator('.piggy').isVisible(), '용돈 저금통이 보인다');
ok(await page.locator('text=60초 랠리').isVisible(), '랠리 입구가 있다');
ok(!(await page.locator('text=어디까지 아는지').count()), '진단을 마쳤으면 안내가 사라진다');
ok(!(await page.locator('text=하트').count()), '하트(생명) UI가 없다');
await shot('4-home', true);

console.log('\n[세션 · 문제 형태]');
await page.locator('button:has-text("오늘의 공부 시작")').click();
await page.waitForSelector('.q');
ok(!!(await current()), '문제가 나온다');

// 일부러 틀려서 오답 화면을 본다
const wq = await answerCurrent({ wrong: true });
await page.locator('.flash.no').waitFor({ state: 'visible' });
const flashText = (await page.locator('.flash.no').textContent()).replace(/\s+/g, ' ');
ok(/정답은|맞는 식|틀린 식/.test(flashText), '오답 시 정답을 알려준다');
ok(flashText.length > 20, `오답 유형을 설명한다 → ${flashText.slice(0, 70)}`);
await shot('5-wrong');
await page.locator('.flash.no button').click();

console.log('\n[중단 복구]');
await page.waitForSelector('.q');
const before = await page.evaluate(() => {
  const s = window.__chaei.store.pdata().activeSession;
  return { key: s.question.factKey, variant: s.question.variant, index: s.index };
});
await page.reload({ waitUntil: 'networkidle' });
await page.locator('button:has-text("이어서 하기")').click();
await page.waitForSelector('.q');
const after = await page.evaluate(() => {
  const s = window.__chaei.store.pdata().activeSession;
  return { key: s.question.factKey, variant: s.question.variant, index: s.index };
});
ok(before.key === after.key && before.index === after.index,
   `새로고침 후 같은 문제에서 이어진다 (${before.key} ${before.variant} @${before.index})`);

console.log('\n[콤보 · 완주]');
const seenVariants = new Set();
const seenModes = new Set();
let comboSeen = false;
for (let i = 0; i < 40; i++) {
  const q = await current();
  if (!q) break;
  seenVariants.add(q.variant);
  seenModes.add(q.mode);
  await answerCurrent();
  if (await page.locator('.combo.on').count()) comboSeen = true;
  await clearFlash();
}
ok(comboSeen, '연속 정답 콤보가 표시된다');
await page.waitForSelector('.result-hero', { timeout: 6000 });
ok(await page.locator('.result-hero').isVisible(), '결과 화면이 나온다');
ok(await page.locator('.piggy-row').isVisible(), '결과에 저금 적립이 보인다');
const earned = await page.locator('.piggy-row').textContent();
ok(/원/.test(earned), `적립 금액이 표시된다 → ${earned.replace(/\s+/g, ' ').slice(0, 50)}`);
await shot('6-result', true);

console.log('\n[여러 판 · 형태 다양성]');
for (let round = 0; round < 3; round++) {
  await page.locator('button:has-text("한 판 더!")').click();
  await page.waitForSelector('.q');
  for (let i = 0; i < 40; i++) {
    const q = await current();
    if (!q) break;
    seenVariants.add(q.variant);
    seenModes.add(q.mode);
    await answerCurrent();
    await clearFlash();
  }
  await page.waitForSelector('.result-hero', { timeout: 6000 });
}
ok(seenVariants.size >= 2, `네 판에서 문제 형태가 ${seenVariants.size}종 나왔다 → ${[...seenVariants]}`);
ok(seenModes.size >= 2, `입력 방식도 섞인다 → ${[...seenModes]}`);

console.log('\n[60초 랠리]');
await page.locator('button:has-text("홈으로")').click();
await page.waitForSelector('.map');
await page.locator('button:has-text("60초 랠리")').click();
await page.waitForSelector('text=60초 안에 몇 개?');
await shot('7-rally-intro');
await page.locator('button:has-text("시작!")').click();
await page.waitForSelector('.rally-hud');
const t0 = await page.locator('.rally-time b').textContent();
await page.waitForTimeout(1500);
const t1 = await page.locator('.rally-time b').textContent();
ok(Number(t1) < Number(t0), `타이머가 줄어든다 (${t0} → ${t1})`);

// 랠리는 세션이 아니라서 activeSession 이 없다. 화면에서 직접 답한다.
const boxBefore = await page.evaluate(() => {
  const d = window.__chaei.store.pdata();
  return Object.values(d.mastery).map((m) => m.box).reduce((a, x) => a + x, 0);
});
for (let i = 0; i < 3; i++) {
  if (await page.locator('.pad-key[aria-label="1"]').count()) {
    await page.locator('.pad-key[aria-label="1"]').click();
    await page.locator('.pad-ok').click();
  } else if (await page.locator('.ox-o').count()) {
    await page.locator('.ox-o').click();
  } else if (await page.locator('.choice').count()) {
    await page.locator('.choice').first().click();
  }
  await page.waitForTimeout(150);
}
const boxAfter = await page.evaluate(() => {
  const d = window.__chaei.store.pdata();
  return Object.values(d.mastery).map((m) => m.box).reduce((a, x) => a + x, 0);
});
ok(boxAfter >= boxBefore, '랠리에서 틀려도 진도가 깎이지 않는다');
await shot('8-rally');
await page.locator('.icon-btn').click();

console.log('\n[부모 화면]');
await page.waitForSelector('.map');
await page.locator('button[title="부모님 화면"]').click();
await page.waitForSelector('.parent');
ok(await page.locator('text=학습 리포트').isVisible(), '리포트가 열린다');
ok(await page.locator('text=용돈 저금통').isVisible(), '저금통 관리가 있다');
ok(await page.locator('text=지금 난이도').isVisible(), '난이도 상태가 보인다');
ok(await page.locator('text=지금 약한 곳').isVisible(), '약한 곳 섹션');
const weakTxt = await page.locator('.card:has-text("지금 약한 곳")').textContent();
ok(/헷갈림|느림|가끔|안 돼요|데이터가 모이지/.test(weakTxt), '무엇과 헷갈리는지 나온다');
await shot('9-parent', true);

console.log('\n[난이도 조정]');
await page.locator('.card:has-text("설정") button:has-text("도전")').click();
await page.waitForTimeout(300);
const hard = await page.evaluate(() => {
  const s = window.__chaei.store.settings();
  return { difficulty: s.difficulty, targetMs: s.targetMs };
});
ok(hard.difficulty === 'hard' && hard.targetMs === 2500,
   `도전을 고르면 목표 시간도 따라온다 → ${JSON.stringify(hard)}`);
const lv = await page.evaluate(() => window.__chaei.store.pdata().levels.mul.level);
ok(lv >= 4, `도전은 레벨을 4 이상으로 끌어올린다 → ${lv}`);
await page.locator('.card:has-text("설정") button:has-text("자동")').click();
await page.waitForTimeout(200);

console.log('\n[현금화 안전장치]');
const noPin = await page.evaluate(() => {
  const w = window.__chaei;
  w.store.updateSettings({ parentPin: '' });
  return w.allowance.payout(10).reason;
});
ok(noPin === 'PIN_REQUIRED', '잠금 번호가 없으면 현금화가 막힌다');
const paid = await page.evaluate(() => {
  const w = window.__chaei;
  w.store.updateSettings({ parentPin: '1234' });
  w.allowance.adjust(1000, '테스트');
  const before = w.allowance.balance();
  const r = w.allowance.payout(300, '문방구');
  return { ok: r.ok, before, after: w.allowance.balance(), last: w.allowance.ledger()[0] };
});
ok(paid.ok && paid.after === paid.before - 300, `현금화하면 잔액이 준다 (${paid.before} → ${paid.after})`);
ok(paid.last.kind === 'payout' && paid.last.note === '문방구', '지급 내역이 남는다');

console.log('\n[둘째 아이 추가]');
await page.locator('button:has-text("+ 아이 추가")').click();
await page.waitForSelector('text=친구를 추가해요');
ok(await page.locator('text=몇 학년이에요?').isVisible(), '학년을 고를 수 있다');
await page.locator('input[aria-label="이름"]').fill('민준');
await page.locator('.card:has-text("몇 학년이에요?") button:has-text("1학년")').click();
await page.locator('.card:has-text("용돈 저금통") button').click();   // 저금통 끄기
ok((await page.locator('.card:has-text("용돈 저금통") button').textContent()).includes('안 쓸래요'),
   '저금통을 꺼둘 수 있다');
await shot('10-add-kid', true);
await page.locator('button:has-text("만들기")').click();

console.log('\n[초1 화면]');
await page.waitForSelector('.q');
const placeSkill = await page.evaluate(() => window.__chaei.sess.placementSkill());
ok(placeSkill === 'addsub', `초1 진단은 곱셈구구가 아니다 → ${placeSkill}`);
await page.locator('.icon-btn').click();          // 진단 건너뛰기
await page.waitForSelector('.screen');
ok(!(await page.locator('text=구구단 지도').count()), '초1에게 구구단 지도가 안 보인다');
ok(await page.locator('text=받아올림 지도').isVisible(), '받아올림 지도가 대신 보인다');
ok(!(await page.locator('.piggy').count()), '저금통을 끈 아이는 저금통 카드가 없다');
const openSkills = await page.evaluate(() => window.__chaei.sess.openSkills());
ok(JSON.stringify(openSkills) === '["addsub"]', `초1 스킬 → ${openSkills}`);
await shot('11-grade1-home', true);

console.log('\n[초1 문제는 한 자리]');
await page.locator('button:has-text("오늘의 공부 시작")').click();
await page.waitForSelector('.q');
let plainOk = true;
for (let i = 0; i < 5; i++) {
  const q = await current();
  if (!q) break;
  if (q.ctx.x >= 20 || q.ctx.y >= 10) plainOk = false;
  await answerCurrent();
  await clearFlash();
}
ok(plainOk, '초1에게 두 자리 문제가 나왔다');
await shot('12-grade1-question');

console.log('\n[아이 전환]');
await page.evaluate(() => window.__chaei.go('home'));
await page.waitForSelector('.screen');
ok(await page.locator('.avatar-swap').isVisible(), '아이가 둘이면 얼굴에 전환 표시가 뜬다');
await page.locator('button.avatar').click();
await page.waitForSelector('.who-list');
ok((await page.locator('.who-card').count()) === 2, '"누구야?" 화면에 두 명이 뜬다');
await shot('13-who');
await page.locator('.who-card:has-text("채이")').click();
await page.waitForSelector('.map');
ok(await page.locator('text=구구단 지도').isVisible(), '채이로 돌아오면 구구단 지도가 보인다');
ok(await page.locator('.piggy').isVisible(), '채이는 저금통이 그대로 있다');

console.log('\n[진도가 섞이지 않는다]');
const split = await page.evaluate(() => {
  const { store, allowance } = window.__chaei;
  const out = {};
  for (const p of store.profiles()) {
    store.setActiveProfile(p.id);
    out[p.name] = { grade: p.grade, facts: Object.keys(store.pdata().mastery).length,
                    won: allowance.enabled() ? allowance.balance() : null };
  }
  return out;
});
ok(Object.keys(split).length === 2, '두 아이가 각자 기록을 갖는다');
ok(split['민준'].won === null && split['채이'].won !== null,
   `저금통이 아이별로 분리된다 → ${JSON.stringify(split)}`);
ok(split['민준'].grade === 1 && split['채이'].grade === 2, '학년이 각자 유지된다');

console.log('\n[백업]');
const exported = await page.evaluate(() => window.__chaei.store.exportJSON());
ok(exported.includes('mastery') && exported.includes('wallet') && exported.length > 500,
   '내보내기에 진도와 저금통이 함께 담긴다');
ok(exported.includes('채이') && exported.includes('민준'), '백업 하나에 두 아이가 모두 담긴다');

if (BUNDLE) {
  console.log('\n[PWA] 단일 파일 빌드라 건너뜀 (manifest·서비스워커·오프라인)');
  ok(!(await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r))),
     '단일 파일에서는 서비스워커를 등록하지 않는다');
} else {
  console.log('\n[PWA]');
  const mani = await page.evaluate(async () => {
    const r = await fetch('./manifest.webmanifest'); return r.ok ? (await r.json()).name : null;
  });
  ok(mani === '채이 수학', 'manifest 를 읽는다 → ' + mani);
  const sw = await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r));
  ok(sw, '서비스워커가 등록된다');

  // 오프라인에서도 열리는가
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(600);
  ok(await page.locator('.map, .screen').first().isVisible(), '네트워크를 끊어도 앱이 열린다');
  await page.context().setOffline(false);
}

console.log('\n[콘솔 오류]');
const real = errs.filter((e) => !/favicon|manifest.*404/i.test(e));
ok(real.length === 0, real.length ? '오류 있음: ' + real.slice(0, 3).join(' | ') : '콘솔 오류 없음');

await b.close();
console.log(fails ? `\n실패 ${fails}건\n` : '\n전부 통과\n');
process.exit(fails ? 1 : 0);
