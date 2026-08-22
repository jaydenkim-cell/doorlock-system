/**
 * 브라우저 시나리오 테스트
 *   python3 -m http.server 7777  로 서버를 띄운 뒤
 *   CHROMIUM=<크로미움경로> node chaei/test/ui.test.mjs /tmp/shots
 */
import { chromium } from 'playwright';
const SHOT = process.argv[2] || '/tmp/chaei-shots';
await (await import('node:fs/promises')).mkdir(SHOT, { recursive: true });
const URL = process.env.APP_URL || 'http://localhost:7777/chaei/';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

// 미리 설치된 Chromium 을 쓰려면 CHROMIUM 환경변수로 경로를 준다
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await b.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });

console.log('\n[첫 실행]');
ok(await page.locator('text=반가워요!').isVisible(), '온보딩 화면이 뜬다');
await page.waitForTimeout(350); await page.screenshot({ path: `${SHOT}/1-onboard.png` });
await page.locator('button[aria-label="🦄"]').click();
await page.locator('button:has-text("시작하기")').click();
await page.waitForSelector('.map');

console.log('\n[홈]');
ok(await page.locator('text=채이 어린이').isVisible(), '이름이 보인다');
ok((await page.locator('.tile').count()) >= 8, '구구단 지도 8칸');
ok(await page.locator('text=이번 주').isVisible(), '주간 도장');
ok(!(await page.locator('text=하트').count()), '하트(생명) UI가 없다');
await page.waitForTimeout(350); await page.screenshot({ path: `${SHOT}/2-home.png`, fullPage: true });

console.log('\n[세션]');
await page.locator('button:has-text("오늘의 공부 시작")').click();
await page.waitForSelector('.q .expr');
ok(await page.locator('.choices .choice').count() === 4, '처음 만나는 문제는 보기 4개');
await page.waitForTimeout(350); await page.screenshot({ path: `${SHOT}/3-session-choice.png` });

// 일부러 틀려서 오답 화면을 본다
const expr = await page.locator('.q .expr').textContent();
const [a, bb] = expr.match(/(\d+) × (\d+)/).slice(1).map(Number);
const answer = a * bb;
const wrongBtn = page.locator('.choice', { hasNotText: String(answer) }).first();
await wrongBtn.click();
await page.waitForSelector('.flash.no');
ok(await page.locator(`.flash.no:has-text("정답은 ${answer}")`).isVisible(), "오답 시 정답을 보여준다");
ok(/정답은 \d+(예요|이에요)/.test(await page.locator(".flash.no").textContent()), "조사가 어법에 맞는다");
const flashText = await page.locator('.flash.no').textContent();
ok(/헷갈림|덧셈|뒤집|어긋|외우지/.test(flashText), '오답 유형을 이름 붙여 알려준다 → ' + flashText.replace(/\s+/g, ' ').slice(0, 60));
await page.waitForTimeout(350); await page.screenshot({ path: `${SHOT}/4-wrong.png` });
await page.locator('.flash.no button').click();

// 나머지는 정답으로 진행 (정답은 window.__chaei 로 읽는다)
console.log('\n[중단 복구]');
await page.waitForSelector('.q .expr');
const before = await page.evaluate(() => window.__chaei.store.pdata().activeSession.question.factKey);
const idx = await page.evaluate(() => window.__chaei.store.pdata().activeSession.index);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('button:has-text("이어서 하기")').click();
await page.waitForSelector('.q .expr');
const after = await page.evaluate(() => window.__chaei.store.pdata().activeSession.question.factKey);
const idx2 = await page.evaluate(() => window.__chaei.store.pdata().activeSession.index);
ok(before === after && idx === idx2, `새로고침 후 같은 문제에서 이어진다 (${before} @${idx})`);

console.log('\n[숫자패드 · 결과]');
let sawPad = false;
for (let i = 0; i < 40; i++) {
  const done = await page.evaluate(() => !window.__chaei.store.pdata().activeSession);
  if (done) break;
  const q = await page.evaluate(() => window.__chaei.store.pdata().activeSession.question);
  if (q.mode === 'input') {
    sawPad = true;
    for (const ch of String(q.answer)) await page.locator(`.pad-key[aria-label="${ch}"]`).click();
    if (i === 3) await page.waitForTimeout(350); await page.screenshot({ path: `${SHOT}/3b-session-numpad.png` });
    await page.locator('.pad-ok').click();
  } else {
    await page.locator('.choice', { hasText: new RegExp(`^${q.answer}$`) }).first().click();
  }
  const flash = page.locator('.flash');
  await flash.first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  const noBtn = page.locator('.flash.no button');
  if (await noBtn.count()) await noBtn.click();
  else await page.waitForTimeout(950);
}
ok(sawPad, '이미 만난 문제는 숫자패드로 직접 입력한다');
await page.waitForSelector('.result-hero', { timeout: 5000 });
ok(await page.locator('.result-hero').isVisible(), '결과 화면이 나온다');
await page.waitForTimeout(350); await page.screenshot({ path: `${SHOT}/5-result.png`, fullPage: true });

console.log('\n[부모 화면]');
await page.locator('button:has-text("홈으로")').click();
await page.waitForSelector('.map');
await page.locator('button[title="부모님 화면"]').click();
await page.waitForSelector('.parent');
ok(await page.locator('text=학습 리포트').isVisible(), '리포트가 열린다');
ok(await page.locator('text=지금 약한 곳').isVisible(), '약한 곳 섹션');
const weakTxt = await page.locator('.card:has-text("지금 약한 곳")').textContent();
ok(/헷갈림|느림|가끔|데이터가 모이지/.test(weakTxt), '무엇과 헷갈리는지 나온다');
await page.waitForTimeout(350); await page.screenshot({ path: `${SHOT}/6-parent.png`, fullPage: true });

console.log('\n[백업]');
const exported = await page.evaluate(() => window.__chaei.store.exportJSON());
ok(exported.includes('mastery') && exported.length > 500, '내보내기에 진도가 담긴다');

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

console.log('\n[콘솔 오류]');
const real = errs.filter((e) => !/favicon|manifest.*404/i.test(e));
ok(real.length === 0, real.length ? '오류 있음: ' + real.slice(0, 3).join(' | ') : '콘솔 오류 없음');

await b.close();
console.log(fails ? `\n실패 ${fails}건\n` : '\n전부 통과\n');
process.exit(fails ? 1 : 0);
