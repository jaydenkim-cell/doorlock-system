/**
 * 단일 HTML 빌드
 *
 * 왜 필요한가: 앱은 ES 모듈 22개로 나뉘어 있는데, 링크 하나로 건네주거나
 * Artifact 로 게시하려면 파일 하나여야 한다.
 *
 * 왜 그냥 이어 붙이면 안 되는가: multiply.js 와 addsub.js 가 둘 다
 * id / title / emoji 를 export 한다. 모듈 스코프를 유지하는 진짜 번들러가 필요하다.
 *
 *   node chaei/build-standalone.mjs
 *     dist/chaei-standalone.html   완전한 문서. 아무 정적 호스팅에나 올리거나 파일로 전달
 *     dist/chaei-artifact.html     문서 골격 없는 본문만. Artifact 게시용
 */

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

const css = await readFile(join(ROOT, 'css/app.css'), 'utf8');

const bundled = await build({
  entryPoints: [join(ROOT, 'js/app.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  charset: 'utf8',
  write: false,
  // 단일 파일에는 sw.js 가 없다. 등록을 남겨두면 404 를 물고 콘솔만 더러워진다.
  define: { 'window.__CHAEI_SINGLE_FILE__': 'true' },
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
await writeFile(join(DIST, 'chaei-artifact.html'),
  `${HEAD_BITS}\n${BODY}\n<script>\n${js}</script>\n`);

// 범용: 어디에 올리든 그대로 열리는 완전한 문서
await writeFile(join(DIST, 'chaei-standalone.html'),
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
<script>
${js}</script>
</body>
</html>
`);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + 'KB';
console.log(`빌드 완료
  dist/chaei-standalone.html   ${kb(js) } JS + ${kb(css)} CSS
  dist/chaei-artifact.html`);
