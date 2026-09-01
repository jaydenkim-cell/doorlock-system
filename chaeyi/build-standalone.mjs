/**
 * 단일 HTML 빌드
 *
 * 왜 필요한가: 앱은 ES 모듈 22개로 나뉘어 있는데, 링크 하나로 건네주거나
 * Artifact 로 게시하려면 파일 하나여야 한다.
 *
 * 왜 그냥 이어 붙이면 안 되는가: multiply.js 와 addsub.js 가 둘 다
 * id / title / emoji 를 export 한다. 모듈 스코프를 유지하는 진짜 번들러가 필요하다.
 *
 *   node chaeyi/build-standalone.mjs
 *     dist/chaeyi-standalone.html   완전한 문서. 아무 정적 호스팅에나 올리거나 파일로 전달
 *     dist/chaeyi-artifact.html     문서 골격 없는 본문만. Artifact 게시용
 */

import { build } from 'esbuild';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

const css = await readFile(join(ROOT, 'css/app.css'), 'utf8');

/**
 * 부위 그림을 본문 안에 넣는다.
 *
 * 아바타는 `assets/parts/` 의 PNG 25장을 겹쳐 그린다. 단일 파일에는 딸린
 * 파일이 없으니 그림도 같이 들어가야 한다 — 안 그러면 아바타가 빈 칸이 된다.
 * `avatar-render.js` 가 이 표를 먼저 본다.
 */
const partDirs = ['body', 'hair', 'top', 'shoe', 'acc'];
const parts = {};
for (const d of partDirs) {
  for (const f of await readdir(join(ROOT, 'assets/parts', d))) {
    if (!f.endsWith('.png')) continue;
    const b64 = (await readFile(join(ROOT, 'assets/parts', d, f))).toString('base64');
    parts[`./assets/parts/${d}/${f}`] = `data:image/png;base64,${b64}`;
  }
}
const PARTS_JS = `window.__CHAEYI_PARTS__=${JSON.stringify(parts)};`;
const partsKB = Math.round(PARTS_JS.length / 1024);

const bundled = await build({
  entryPoints: [join(ROOT, 'js/app.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  charset: 'utf8',
  write: false,
  // 단일 파일에는 sw.js 가 없다. 등록을 남겨두면 404 를 물고 콘솔만 더러워진다.
  define: { 'window.__CHAEYI_SINGLE_FILE__': 'true' },
});
const js = bundled.outputFiles[0].text;

const BODY = `<div id="app">
  <div class="empty"><div class="big">✖️</div><div>불러오는 중…</div></div>
</div>
<noscript><div class="empty">이 앱을 쓰려면 자바스크립트를 켜주세요.</div></noscript>`;

const HEAD_BITS = `<title>채이 수학</title>
<style>
${css}
</style>`;

// Artifact 용: 게시할 때 doctype/html/head/body 로 감싸주므로 본문만 넣는다
await mkdir(DIST, { recursive: true });
await writeFile(join(DIST, 'chaeyi-artifact.html'),
  `${HEAD_BITS}\n${BODY}\n<script>${PARTS_JS}</script>\n<script>\n${js}</script>\n`);

// 범용: 어디에 올리든 그대로 열리는 완전한 문서
await writeFile(join(DIST, 'chaeyi-standalone.html'),
`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#fdf6ec">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="채이수학">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9C%96%EF%B8%8F%3C/text%3E%3C/svg%3E">
${HEAD_BITS}
</head>
<body>
${BODY}
<script>${PARTS_JS}</script>
<script>
${js}</script>
</body>
</html>
`);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + 'KB';
console.log(`빌드 완료
  dist/chaeyi-standalone.html   ${kb(js)} JS + ${kb(css)} CSS + ${partsKB}KB 부위 그림
  dist/chaeyi-artifact.html     그림 ${Object.keys(parts).length}장 포함`);
