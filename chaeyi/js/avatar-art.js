/**
 * 종이인형 아바타 (SVG)
 *
 * 참고한 것은 인터넷에 흔한 **한국 종이인형 도안**이다. 그 그림체의 규칙은
 * 뚜렷하고, 규칙을 지키는 것이 곧 "잘 그린 것" 이다.
 *
 *   1) **굵은 검은 외곽선.** 모든 덩어리에 같은 굵기의 선이 둘린다.
 *      이게 없으면 아무리 색을 잘 써도 도안이 아니라 그림자 없는 색면이 된다.
 *      앞선 시도가 유치해 보였던 가장 큰 이유가 이것이었다.
 *   2) **전신 치비.** 머리가 키의 40% 쯤 되는 2.5등신. 반신 초상화가 아니다 —
 *      옷을 갈아입히는 놀이라 몸이 보여야 한다.
 *   3) **평면 채색.** 파스텔 한 톤씩. 그라데이션·명암을 넣으면 오히려 탁해진다.
 *   4) **큰 눈, 작은 입, 볼터치.**
 *
 * 그림은 전부 인라인 SVG 다. 이 앱은 오프라인 PWA 라 외부 이미지를 못 쓰고,
 * 부위 조합이 수십만 가지라 이미지로는 감당이 안 된다.
 *
 * 좌표계는 100×100. 인형은 x 20~80, y 5~96 을 쓴다.
 * **모든 부위가 이 뼈대를 기준으로 그려지므로 하나를 옮기면 전부 어긋난다.**
 *
 * 저작권: 특정 작품의 캐릭터를 따라 그리지 않는다. 굵은 선과 큰 눈은
 * 그림체이지 남의 캐릭터가 아니다.
 */

/**
 * 선 굵기는 두 가지다. 바깥 실루엣은 굵게, 안쪽 디테일은 가늘게.
 * 전부 같은 굵기로 그으면 형태의 위계가 사라져 스티커처럼 납작해 보인다.
 */
export const LINE = '#3a2f38';
const SW = 2.7;    // 바깥 실루엣
const SWI = 1.7;   // 안쪽 디테일

// ── 뼈대 ────────────────────────────────────────────────────────────
//
// **머리가 크고 몸이 작다.** 참고한 종이인형 도안의 비율이 그렇고, 이게
// 안 맞으면 아무리 잘 그려도 귀엽지 않다. 앞선 시도가 계속 어색했던 진짜
// 이유가 이 비율이었다 — 머리를 얼굴 크기로만 보고 작게 잡고 있었다.
//
//   얼굴  y  5 ~ 55  (세로의 절반)
//   몸통  y 53 ~ 72
//   다리  y 70 ~ 93
//
// 얼굴은 **거의 원**이다. 갸름하면 어른 얼굴이 된다.

const HEAD = 'M50 4.6 C64.8 4.6 76.4 14.4 76.4 29 C76.4 40.4 70 49.6 61.4 53.4 C57.8 55 54 55.6 50 55.6 C46 55.6 42.2 55 38.6 53.4 C30 49.6 23.6 40.4 23.6 29 C23.6 14.4 35.2 4.6 50 4.6 Z';
const TORSO = 'M42.4 52.6 C45.2 51 54.8 51 57.6 52.6 L58.8 65.6 C58.8 69.6 54.8 71.8 50 71.8 C45.2 71.8 41.2 69.6 41.2 65.6 Z';
const ARM_L = 'M43.4 53 C39.4 54 36.8 57.4 36.2 62 L35.6 68.4 L40.4 69 L41 62.6 C41.4 59.4 42.8 57.4 45 56.6 Z';
const ARM_R = 'M56.6 53 C60.6 54 63.2 57.4 63.8 62 L64.4 68.4 L59.6 69 L59 62.6 C58.6 59.4 57.2 57.4 55 56.6 Z';
const HAND_L = 'M38 69.6 a3.4 3.4 0 1 0 .01 0 Z';
const HAND_R = 'M62 69.6 a3.4 3.4 0 1 0 .01 0 Z';
const LEG_L = 'M43 69.6 h6.6 v17 q0 3.4 -3.3 3.4 t-3.3 -3.4 Z';
const LEG_R = 'M50.4 69.6 h6.6 v17 q0 3.4 -3.3 3.4 t-3.3 -3.4 Z';
const FOOT_L = 'M41.6 85.6 h8 q1.8 0 1.8 2.2 v2.8 q0 2.2 -1.8 2.2 h-8 q-1.8 0 -1.8 -2.2 v-2.8 q0 -2.2 1.8 -2.2 Z';
const FOOT_R = 'M50.4 85.6 h8 q1.8 0 1.8 2.2 v2.8 q0 2.2 -1.8 2.2 h-8 q-1.8 0 -1.8 -2.2 v-2.8 q0 -2.2 1.8 -2.2 Z';
/** 인형이 기본으로 입고 있는 속옷 — 옷을 다 벗겨도 맨몸이 되지 않게 */
const UNDIES = 'M41.8 61.6 C45 60.6 55 60.6 58.2 61.6 L58.6 65.6 C58.6 69.4 54.8 71.4 50 71.4 C45.2 71.4 41.4 69.4 41.4 65.6 Z';

/**
 * 머리카락·꾸밈은 예전(작은 두상) 좌표로 그려져 있다. 두상을 키우면서
 * 12벌을 전부 다시 그리는 대신 **좌표계를 옮긴다** — 손으로 옮기면 반드시
 * 몇 개가 어긋나고, 나중에 두상을 또 만질 때 같은 일을 반복하게 된다.
 *   옛 두상 x[26.6,73.4] y[4.6,47.4]  →  새 두상 x[24,76] y[5,55]
 * 선 굵기는 `non-scaling-stroke` 로 고정한다 (안 그러면 가로세로가 다르게 늘어난다).
 */
const HEAD_FIT = 'translate(-5.56 -0.37) scale(1.1111 1.1682)';

/** 피부톤. 밝은 쪽만 넣으면 그건 선택지가 아니다. 값은 매기지 않는다. */
export const SKINS = [
  { id: 'skin-1', label: '밝은',   color: '#ffeade' },
  { id: 'skin-2', label: '고운',   color: '#ffdec5' },
  { id: 'skin-3', label: '따뜻한', color: '#f6c79f' },
  { id: 'skin-4', label: '건강한', color: '#dda06e' },
  { id: 'skin-5', label: '짙은',   color: '#a97448' },
  { id: 'skin-6', label: '깊은',   color: '#7a5030' },
];

/**
 * 머리색 세 톤.
 *   color 바탕 / dark 뒷머리·결 / hi 하이라이트 띠
 * 하이라이트 띠는 참고 도안의 핵심이다. 평면 채색이어도 이 띠 하나로
 * 머리가 덩어리에서 머리카락이 된다.
 */
export const HAIR_COLORS = [
  { id: 'hc-black',  label: '검정',   color: '#4e4557', dark: '#3a3342', hi: '#6e6479' },
  { id: 'hc-brown',  label: '갈색',   color: '#9c6640', dark: '#7d4e2d', hi: '#bb8a63' },
  { id: 'hc-choco',  label: '진갈색', color: '#63422d', dark: '#4b3120', hi: '#84604a' },
  { id: 'hc-blonde', label: '금발',   color: '#f7d47f', dark: '#dcb254', hi: '#fff0bd', price: 40 },
  { id: 'hc-orange', label: '주황',   color: '#f79f5c', dark: '#dd7f38', hi: '#ffc596', price: 40 },
  { id: 'hc-pink',   label: '분홍',   color: '#ffa6cb', dark: '#ec85b0', hi: '#ffd0e4', price: 70 },
  { id: 'hc-purple', label: '보라',   color: '#b99af5', dark: '#9b78e0', hi: '#dccbff', price: 70 },
  { id: 'hc-blue',   label: '파랑',   color: '#8ecaf7', dark: '#6aa9de', hi: '#c4e6ff', price: 70 },
  { id: 'hc-mint',   label: '민트',   color: '#88e6c9', dark: '#63c9a8', hi: '#c1f5e4', price: 100 },
  { id: 'hc-silver', label: '은발',   color: '#e6ebf4', dark: '#c6cedd', hi: '#ffffff', price: 100 },
  { id: 'hc-cotton', label: '솜사탕', color: '#ffbdf0', dark: '#ef9ade', hi: '#ffe0f8', price: 130 },
  { id: 'hc-fire',   label: '불꽃',   color: '#ffa963', dark: '#ef6f38', hi: '#ffdba6', unlock: 'fire' },
];

/** 눈동자 — 아래 밝은 톤 + 위 그늘. 평면 두 톤이 곧 셀 셰이딩이다. */
export const EYE_COLORS = [
  { id: 'ec-brown',  label: '갈색', color: '#a9753f', dark: '#7a4d24' },
  { id: 'ec-dark',   label: '검정', color: '#5e5468', dark: '#413947' },
  { id: 'ec-sky',    label: '하늘', color: '#7cc6ee', dark: '#4a94c4', price: 40 },
  { id: 'ec-green',  label: '초록', color: '#79ce9c', dark: '#4a9e6f', price: 40 },
  { id: 'ec-violet', label: '보라', color: '#b193ee', dark: '#8064c4', price: 60 },
  { id: 'ec-rose',   label: '장미', color: '#f68aae', dark: '#cd5c84', price: 60 },
  { id: 'ec-amber',  label: '호박', color: '#eeb757', dark: '#c48c2c', price: 80 },
  { id: 'ec-aqua',   label: '물빛', color: '#6bd4cd', dark: '#3ba7a1', price: 80 },
  { id: 'ec-galaxy', label: '은하', color: '#a37ff0', dark: '#6b4ac4', unlock: 'medal' },
];

// ── 머리 ────────────────────────────────────────────────────────────
//
// 한 스타일이 네 겹이다. back(뒷머리) · front(앞머리) · hi(하이라이트 띠) ·
// lines(결). 뒤의 둘이 빠지면 아무리 실루엣을 잘 잡아도 헬멧으로 보인다.
// 두상은 x 26.6~73.4, y 4.6~47.4. 머리카락은 그보다 1~3 바깥으로 부풀린다 —
// 두피에 딱 붙으면 인형이 아니라 수영모를 쓴 것처럼 된다.

/** 대부분의 스타일이 함께 쓰는 하이라이트 띠와 결 */
const HI = 'M34.8 16 C36.6 8.6 45 4.6 54.6 6 C47.6 8.4 41 11.8 38.4 17.6 Z';
const LINES = 'M38.6 5.4 C35.6 9.4 34.4 13.4 34.4 16.6 M50 2.6 C49 6.6 48.6 10.6 48.8 14 M61.4 5.4 C64.4 9.4 65.6 13.4 65.6 16.6';

export const HAIRS = [
  {
    id: 'hair-short', label: '숏컷',
    front: 'M25.6 28.6 C24 11.4 35 2 50 2 C65 2 76 11.4 74.4 28.6 C73.4 23.6 71.4 19.8 68.6 19.0 C62 20.2 56 20.599999999999998 50 20.599999999999998 C44 20.599999999999998 38 20.2 31.4 19.0 C28.6 19.8 26.6 23.6 25.6 28.6 Z',
    hi: HI, lines: LINES,
  },
  {
    id: 'hair-bob', label: '단발',
    back: 'M24.6 30 C23 10 35 1 50 1 C65 1 77 10 75.4 30 L76.6 46 C77 50.6 73.6 52.6 69.6 51.6 L66 50.6 L65 30 L35 30 L34 50.6 L30.4 51.6 C26.4 52.6 23 50.6 23.4 46 Z',
    front: 'M25.6 28 C24 11 35 2 50 2 C65 2 76 11 74.4 28 C73.4 23 71.4 19.599999999999998 68.6 18.799999999999997 C62 20 56 20.4 50 20.4 C44 20.4 38 20 31.4 18.799999999999997 C28.6 19.599999999999998 26.6 23 25.6 28 Z',
    hi: HI, lines: LINES,
  },
  {
    id: 'hair-long', label: '긴머리',
    back: 'M23.6 30 C22 9 34.6 0 50 0 C65.4 0 78 9 76.4 30 L79 74 C79.4 81 75.4 83.6 70.4 82.6 L66.4 81.6 L65 34 L35 34 L33.6 81.6 L29.6 82.6 C24.6 83.6 20.6 81 21 74 Z',
    front: 'M25.6 27.6 C24 10.6 35 1.6 50 1.6 C65 1.6 76 10.6 74.4 27.6 C73.4 22.6 71.4 19.599999999999998 68.6 18.799999999999997 C62 20 56 20.4 50 20.4 C44 20.4 38 20 31.4 18.799999999999997 C28.6 19.599999999999998 26.6 22.6 25.6 27.6 Z',
    hi: HI, lines: LINES + ' M26.6 44 C24.6 56 24 68 25.4 78 M73.4 44 C75.4 56 76 68 74.6 78',
  },
  {
    id: 'hair-wave', label: '웨이브',
    back: 'M23.6 30 C22 9 34.6 0 50 0 C65.4 0 78 9 76.4 30 C80.6 39 75.6 46 80.6 55 C84 62 76.4 67.6 80 75.4 C82.4 80.6 76.4 86 69.4 82.6 L65 34 L35 34 L30.6 82.6 C23.6 86 17.6 80.6 20 75.4 C23.6 67.6 16 62 19.4 55 C24.4 46 19.4 39 23.6 30 Z',
    front: 'M25.6 27.6 C24 10.6 35 1.6 50 1.6 C65 1.6 76 10.6 74.4 27.6 C73.4 22.6 71.4 19.2 68.6 18.4 C62 20.6 56 21.0 50 21.0 C44 21.0 38 20.6 31.4 18.4 C28.6 19.2 26.6 22.6 25.6 27.6 Z',
    hi: HI, lines: LINES,
  },
  {
    id: 'hair-pony', label: '포니테일', price: 60,
    back: 'M24.6 29 C23 9.6 35 0.6 50 0.6 C65 0.6 77 9.6 75.4 29 L75.4 40 Q75.4 44 71.4 44 L28.6 44 Q24.6 44 24.6 40 Z M70.6 13.6 C84.6 19.6 90.6 34.6 88 50 C86.2 62 79.4 70.6 71.6 74 C78 64 81.4 51.6 79.4 40 C77.8 30 74.6 20.6 70.6 16.6 Z',
    front: 'M25.6 27.6 C24 10.6 35 1.6 50 1.6 C65 1.6 76 10.6 74.4 27.6 C73.4 22.6 71.4 19.599999999999998 68.6 18.799999999999997 C62 20 56 20.4 50 20.4 C44 20.4 38 20 31.4 18.799999999999997 C28.6 19.599999999999998 26.6 22.6 25.6 27.6 Z',
    hi: HI, lines: LINES,
  },
  {
    id: 'hair-twin', label: '양갈래', unlock: 'crown',
    back: 'M24.6 29 C23 9.6 35 0.6 50 0.6 C65 0.6 77 9.6 75.4 29 L75.4 39 Q75.4 43 71.4 43 L28.6 43 Q24.6 43 24.6 39 Z M26.4 25.6 C14 29.6 6.4 41.6 6 55.6 C5.6 68 10.6 77 18.6 79.4 C26 81.4 30.6 75.6 28.6 68 C25.6 54 26.4 39.4 30.6 28.6 Z M73.6 25.6 C86 29.6 93.6 41.6 94 55.6 C94.4 68 89.4 77 81.4 79.4 C74 81.4 69.4 75.6 71.4 68 C74.4 54 73.6 39.4 69.4 28.6 Z',
    front: 'M25.6 27.6 C24 10.6 35 1.6 50 1.6 C65 1.6 76 10.6 74.4 27.6 C73.4 22.6 71.4 19.599999999999998 68.6 18.799999999999997 C62 20 56 20.4 50 20.4 C44 20.4 38 20 31.4 18.799999999999997 C28.6 19.599999999999998 26.6 22.6 25.6 27.6 Z',
    hi: HI, lines: LINES + ' M15.6 40 C12 48.6 11.6 59.6 14.4 68 M84.4 40 C88 48.6 88.4 59.6 85.6 68',
  },
  {
    id: 'hair-curl', label: '곱슬', price: 80,
    back: 'M50 -1.4 C41.4 -1.4 34.4 1.4 30 6.6 C21.6 4.6 14.4 10 14 17.6 C7 21 4.6 30 9 36.6 C5.6 43.6 9 52.4 16.4 55.6 C18 63.6 26.4 68 34.6 65.6 L65.4 65.6 C73.6 68 82 63.6 83.6 55.6 C91 52.4 94.4 43.6 91 36.6 C95.4 30 93 21 86 17.6 C85.6 10 78.4 4.6 70 6.6 C65.6 1.4 58.6 -1.4 50 -1.4 Z',
    front: 'M26 27.6 C22.6 12.6 33.6 1.6 48.4 0.6 C61.6 -0.4 75.4 6.6 76.6 19.6 C77.2 24 77 26.4 76 30.4 C74.6 22.6 71.6 18 67.6 16.6 C62 20.6 56.4 21.6 50 21.6 C43.6 21.6 38 20.6 32.4 16.6 C28.6 18 26.8 22 26 27.6 Z',
    hi: 'M33.6 15 C35.6 8 44 4 53.6 5.4 C46.6 7.6 40 11 37.4 16.6 Z', lines: LINES,
  },
  {
    id: 'hair-bun', label: '하프업', price: 80,
    back: 'M24.6 29 C23 9.6 35 1.6 50 1.6 C65 1.6 77 9.6 75.4 29 L76.6 52 Q76.6 56.6 71.6 56.6 L28.4 56.6 Q23.4 56.6 23.4 52 Z M50 -6.4 C57.6 -6.4 62.6 -1.6 62.6 4.6 C62.6 10.6 57.6 15.6 50 15.6 C42.4 15.6 37.4 10.6 37.4 4.6 C37.4 -1.6 42.4 -6.4 50 -6.4 Z',
    front: 'M25.6 27.6 C24 10.6 35 1.6 50 1.6 C65 1.6 76 10.6 74.4 27.6 C73.6 20.6 70.6 16.6 67 15.4 C61.4 19.4 55.6 20.6 50 20.6 C44.4 20.6 38.6 19.4 33 15.4 C29.4 16.6 26.4 20.6 25.6 27.6 Z',
    hi: HI, lines: LINES,
  },
  {
    id: 'hair-pixie', label: '픽시컷', price: 100,
    front: 'M25.6 28.6 C24 11.4 35 2 50 2 C66.6 2 76 11 74.4 28.6 C73.6 22 71.6 17.6 68.6 16 C62.6 20 51.6 21.4 41.4 19.6 C36.6 18.8 32.4 17.4 30.4 15.6 C27.6 18 25.9 23.6 25.6 28.6 Z',
    hi: 'M34.8 16 C36.6 9 45 5 54 6.4 C47.4 8.6 41 12 38.4 17.4 Z',
    lines: 'M39.6 6.6 C36 12 34.4 18 34.6 24 M52.6 3.6 C52 9 51 13.6 49 17.6 M65.6 7.6 C68.6 13 70 19.4 69.6 25',
  },
  {
    id: 'hair-afro', label: '아프로', price: 100,
    back: 'M50 -2.4 C29 -2.4 14.6 10.6 14.6 28.6 C14.6 42 22.6 53 34 57 L66 57 C77.4 53 85.4 42 85.4 28.6 C85.4 10.6 71 -2.4 50 -2.4 Z',
    front: 'M26 27.6 C22.6 12.4 34.6 1.6 50 1.6 C65.4 1.6 77.4 12.4 74 27.6 C73 19.6 69.4 15 65 13.6 C60 18.4 55.4 19.6 50 19.6 C44.6 19.6 40 18.4 35 13.6 C30.6 15 27 19.6 26 27.6 Z',
    hi: 'M32.6 13.6 C34.6 5.6 43.6 1 54 2.6 C46.6 5 39.6 8.6 36.6 15 Z', lines: LINES,
  },
  {
    id: 'hair-space', label: '공주머리', price: 140,
    back: 'M24.6 29 C23 9.6 35 0.6 50 0.6 C65 0.6 77 9.6 75.4 29 L75.4 46 Q75.4 50 71.4 50 L28.6 50 Q24.6 50 24.6 46 Z M17.6 25.6 C9 25.6 2.6 18.6 2.6 10 C2.6 1.4 9 -5.6 17.6 -5.6 C26.2 -5.6 32.6 1.4 32.6 10 C32.6 18.6 26.2 25.6 17.6 25.6 Z M82.4 25.6 C91 25.6 97.4 18.6 97.4 10 C97.4 1.4 91 -5.6 82.4 -5.6 C73.8 -5.6 67.4 1.4 67.4 10 C67.4 18.6 73.8 25.6 82.4 25.6 Z',
    front: 'M25.6 27.6 C24 10.6 35 1.6 50 1.6 C65 1.6 76 10.6 74.4 27.6 C73.4 22.6 71.4 19.599999999999998 68.6 18.799999999999997 C62 20 56 20.4 50 20.4 C44 20.4 38 20 31.4 18.799999999999997 C28.6 19.599999999999998 26.6 22.6 25.6 27.6 Z',
    hi: HI, lines: LINES,
  },
  {
    id: 'hair-hime', label: '히메컷', price: 140,
    back: 'M23.6 30 C22 9 34.6 0 50 0 C65.4 0 78 9 76.4 30 L78 72 Q78.4 78.6 72.6 78.6 L67.4 78.6 L65 34 L35 34 L32.6 78.6 L27.4 78.6 Q21.6 78.6 22 72 Z',
    front: 'M25.6 27.6 C24 10.6 35 1.6 50 1.6 C65 1.6 76 10.6 74.4 27.6 C73.4 22.6 71.4 19.599999999999998 68.6 18.799999999999997 C62 20 56 20.4 50 20.4 C44 20.4 38 20 31.4 18.799999999999997 C28.6 19.599999999999998 26.6 22.6 25.6 27.6 Z M23.6 22.6 C20.4 32.6 20.6 43.6 23 52.6 L30.6 52.6 C28.4 43.6 28 32.6 30.6 22.6 Z M76.4 22.6 C79.6 32.6 79.4 43.6 77 52.6 L69.4 52.6 C71.6 43.6 72 32.6 69.4 22.6 Z',
    hi: HI, lines: LINES,
  },
];

// ── 표정 ────────────────────────────────────────────────────────────
//
// 참고 도안의 눈은 **가로로 길고 얼굴 아래쪽에 있다.** 세로로 큰 동그란 눈은
// 서양 카툰이고, 이 그림체는 눈이 옆으로 눕는다. 그리고 **눈썹이 보인다** —
// 앞머리 바로 아래에 가늘게. 이 둘이 인상을 거의 다 결정한다.
//
//   눈  cy 37 (얼굴 세로의 63% 지점) · 가로 8.4 / 세로 7.2
//   눈썹 y 25 · 가늘고 짧게
//   입  y 47 · 아주 작게

const EX = { l: 38.4, r: 61.6, cy: 37 };

const EYE = (x, c, rx = 8.4, ry = 7.2) => {
  const ir = rx - 1.7, iry = ry - 1.1;
  const f = (v) => Number(v).toFixed(2);
  const cy = EX.cy;
  return `
  <ellipse cx="${x}" cy="${cy}" rx="${f(rx)}" ry="${f(ry)}" fill="#fffdfb" stroke="${LINE}" stroke-width="${SW}"/>
  <ellipse cx="${x}" cy="${f(cy + 0.7)}" rx="${f(ir)}" ry="${f(iry)}" fill="${c.eye}"/>
  <path d="M${f(x - ir)} ${f(cy + 0.7)} A${f(ir)} ${f(iry)} 0 0 1 ${f(x + ir)} ${f(cy + 0.7)} A${f(ir)} ${f(iry * 0.5)} 0 0 0 ${f(x - ir)} ${f(cy + 0.7)} Z" fill="${c.eyeDark}"/>
  <ellipse cx="${x}" cy="${f(cy + 0.9)}" rx="${f(rx * 0.3)}" ry="${f(ry * 0.42)}" fill="${LINE}"/>
  <circle cx="${f(x - rx * 0.3)}" cy="${f(cy - ry * 0.4)}" r="${f(rx * 0.28)}" fill="#fff"/>
  <circle cx="${f(x + rx * 0.33)}" cy="${f(cy + ry * 0.5)}" r="${f(rx * 0.14)}" fill="#fff"/>`;
};

/** 위 눈꺼풀 — 눈 위를 덮는 굵은 띠. 이 선이 이 그림체의 표식이다. */
const LID = (x, dir, rx = 8.4, ry = 7.2) => {
  const f = (v) => Number(v).toFixed(2);
  const top = EX.cy - ry;
  return `
  <path d="M${f(x - rx - 0.2)} ${f(top + ry * 0.5)}
           C${f(x - rx * 0.7)} ${f(top - 0.9)} ${f(x + rx * 0.7)} ${f(top - 0.9)} ${f(x + rx + 0.2)} ${f(top + ry * 0.5)}"
        stroke="${LINE}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M${f(x + dir * (rx + 0.2))} ${f(top + ry * 0.42)} L${f(x + dir * (rx + 3.2))} ${f(top - 0.8)}"
        stroke="${LINE}" stroke-width="2.1" stroke-linecap="round"/>`;
};

const CLOSED = (x, dir) => `
  <path d="M${x - 8} ${EX.cy + 2.6} C${x - 5.4} ${EX.cy - 4.6} ${x + 5.4} ${EX.cy - 4.6} ${x + 8} ${EX.cy + 2.6}"
        stroke="${LINE}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <path d="M${(x + dir * 8).toFixed(2)} ${EX.cy - 0.6} L${(x + dir * 11.4).toFixed(2)} ${EX.cy - 3.4}"
        stroke="${LINE}" stroke-width="2.2" stroke-linecap="round"/>`;

/** 눈썹 — 앞머리 바로 아래. 가늘고 짧아야 어리게 보인다. */
const BROWS = (c, dy = 0, tilt = 0) => `
  <path d="M32.6 ${(26.6 + dy + tilt).toFixed(2)} Q38.4 ${(24.6 + dy).toFixed(2)} 44 ${(26.4 + dy - tilt).toFixed(2)}"
        stroke="${c.brow}" stroke-width="1.7" fill="none" stroke-linecap="round" opacity=".8"/>
  <path d="M67.4 ${(26.6 + dy + tilt).toFixed(2)} Q61.6 ${(24.6 + dy).toFixed(2)} 56 ${(26.4 + dy - tilt).toFixed(2)}"
        stroke="${c.brow}" stroke-width="1.7" fill="none" stroke-linecap="round" opacity=".8"/>`;

const BLUSH = () => `
  <ellipse cx="28.6" cy="45.6" rx="5.4" ry="3.2" fill="#ffb3c6"/>
  <ellipse cx="71.4" cy="45.6" rx="5.4" ry="3.2" fill="#ffb3c6"/>`;

const SMILE = () => `
  <path d="M46.6 47.6 Q50 50.6 53.4 47.6" stroke="${LINE}" stroke-width="2.1" fill="none" stroke-linecap="round"/>`;

const OPEN = (w = 4.4, h = 5) => `
  <path d="M${50 - w} 46.6 Q50 ${46.6 + h} ${50 + w} 46.6 Q50 ${46.6 + h * 0.3} ${50 - w} 46.6 Z"
        fill="#c4485f" stroke="${LINE}" stroke-width="${SWI}" stroke-linejoin="round"/>`;

export const FACES = [
  { id: 'face-smile', label: '기본',
    draw: (c) => EYE(EX.l, c) + EYE(EX.r, c) + LID(EX.l, -1) + LID(EX.r, 1)
      + BLUSH() + SMILE() },
  { id: 'face-happy', label: '활짝',
    draw: () => CLOSED(EX.l, -1) + CLOSED(EX.r, 1) + BLUSH() + OPEN(4.8, 5.6) },
  { id: 'face-sparkle', label: '반짝', price: 50,
    draw: (c) => EYE(EX.l, c, 9, 8) + EYE(EX.r, c, 9, 8)
      + LID(EX.l, -1, 9, 8) + LID(EX.r, 1, 9, 8) + BLUSH() + SMILE() + `
      <g fill="#ffe066" stroke="${LINE}" stroke-width="1.3" stroke-linejoin="round">
        <path d="M20.6 24 l2 4.4 4.4 2 -4.4 2 -2 4.4 -2 -4.4 -4.4 -2 4.4 -2 Z"/>
        <path d="M80.6 29 l1.4 3.1 3.1 1.4 -3.1 1.4 -1.4 3.1 -1.4 -3.1 -3.1 -1.4 3.1 -1.4 Z"/>
      </g>` },
  { id: 'face-wink', label: '윙크', price: 50,
    draw: (c) => CLOSED(EX.l, -1) + EYE(EX.r, c) + LID(EX.r, 1) + BLUSH() + `
      <path d="M46.6 48 Q50 50.6 53.8 46.6" stroke="${LINE}" stroke-width="2.1" fill="none" stroke-linecap="round"/>` },
  { id: 'face-cool', label: '시크', price: 70,
    draw: (c) => BROWS(c, 0.6, 1.8) + EYE(EX.l, c, 8, 5.6) + EYE(EX.r, c, 8, 5.6)
      + LID(EX.l, -1, 8, 5.6) + LID(EX.r, 1, 8, 5.6) + `
      <path d="M46.6 48 L53.4 47.6" stroke="${LINE}" stroke-width="2.1" stroke-linecap="round"/>` },
  { id: 'face-oh', label: '놀람', price: 70,
    draw: (c) => EYE(EX.l, c, 8.6, 8) + EYE(EX.r, c, 8.6, 8)
      + LID(EX.l, -1, 8.6, 8) + LID(EX.r, 1, 8.6, 8) + BLUSH() + `
      <ellipse cx="50" cy="48.6" rx="3" ry="3.8" fill="#c4485f" stroke="${LINE}" stroke-width="${SWI}"/>` },
  { id: 'face-love', label: '하트눈', price: 110,
    draw: () => `
      <g fill="#ff5f8d" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round">
        <path d="M38.4 44.6 C30 37.6 30.4 30.4 35 28 C37.8 26.6 38.4 28.6 38.4 28.6 C38.4 28.6 39 26.6 41.8 28 C46.4 30.4 46.8 37.6 38.4 44.6 Z"/>
        <path d="M61.6 44.6 C53.2 37.6 53.6 30.4 58.2 28 C61 26.6 61.6 28.6 61.6 28.6 C61.6 28.6 62.2 26.6 65 28 C69.6 30.4 70 37.6 61.6 44.6 Z"/>
      </g>
      <circle cx="35.6" cy="33.4" r="2" fill="#fff"/>
      <circle cx="58.8" cy="33.4" r="2" fill="#fff"/>` + BLUSH() + OPEN(3.8, 4.4) },
];

export const TOP_COLORS = [
  { id: 'tc-mint',  label: '민트',     color: '#9fe8cf' },
  { id: 'tc-sky',   label: '하늘',     color: '#b0dbfa' },
  { id: 'tc-coral', label: '산호',     color: '#ffab9c' },
  { id: 'tc-sun',   label: '노랑',     color: '#ffe084', price: 30 },
  { id: 'tc-grape', label: '보라',     color: '#cdb6f8', price: 30 },
  { id: 'tc-pink',  label: '분홍',     color: '#ffb8d1', price: 30 },
  { id: 'tc-ink',   label: '남색',     color: '#8b9bcc', price: 50 },
  { id: 'tc-cream', label: '아이보리', color: '#fff3e0', price: 50 },
];

/** 옷은 몸보다 살짝 커야 "덧입힌" 느낌이 난다. 종이인형의 규칙이다. */
const TEE = 'M41.4 51.6 C44.6 49.6 55.4 49.6 58.6 51.6 L63.4 56.4 L60 60.4 L59.8 65.6 C59.8 70 55.2 72.6 50 72.6 C44.8 72.6 40.2 70 40.2 65.6 L40 60.4 L36.6 56.4 Z';
const DRESS = 'M41.4 51.6 C44.6 49.6 55.4 49.6 58.6 51.6 L63.4 56.4 L60 60.4 L63.4 76 C63.4 80 57.4 82.4 50 82.4 C42.6 82.4 36.6 80 36.6 76 L40 60.4 L36.6 56.4 Z';
const COLLAR = 'M46 50.6 C47.6 54 52.4 54 54 50.6';

export const TOPS = [
  { id: 'top-tee', label: '티셔츠',
    draw: (c) => `<path d="${TEE}" fill="${c}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="${COLLAR}" fill="none" stroke="${LINE}" stroke-width="${SWI}"/>` },
  { id: 'top-hoodie', label: '후드',
    draw: (c) => `<path d="${TEE}" fill="${c}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M44.4 49.6 C46.6 56 53.4 56 55.6 49.6" fill="none" stroke="${LINE}" stroke-width="${SW}"/>
      <path d="M47.2 56.6 L46.6 63" stroke="${LINE}" stroke-width="${SWI}" stroke-linecap="round"/>
      <path d="M52.8 56.6 L53.4 63" stroke="${LINE}" stroke-width="${SWI}" stroke-linecap="round"/>` },
  { id: 'top-dress', label: '원피스',
    draw: (c) => `<path d="${DRESS}" fill="${c}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="${COLLAR}" fill="none" stroke="${LINE}" stroke-width="${SWI}"/>
      <path d="M38.4 70 C43.6 72 56.4 72 61.6 70" fill="none" stroke="${LINE}" stroke-width="${SWI}"/>` },
  { id: 'top-stripe', label: '줄무늬', price: 50,
    draw: (c) => `<path d="${TEE}" fill="${c}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M39.8 58.6 L60.2 58.6 M39.9 63.4 L60.1 63.4 M40.4 68.2 L59.6 68.2" stroke="#fff" stroke-width="2.6" opacity=".9"/>
      <path d="${COLLAR}" fill="none" stroke="${LINE}" stroke-width="${SWI}"/>` },
  { id: 'top-overall', label: '멜빵바지', price: 70,
    draw: (c) => `
      <path d="M41.6 58.6 L58.4 58.6 L59.8 65.6 C59.8 70 55.2 72.6 50 72.6 C44.8 72.6 40.2 70 40.2 65.6 Z"
            fill="${c}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M44.4 59 L45.2 51 M55.6 59 L54.8 51" stroke="${LINE}" stroke-width="${SW}" stroke-linecap="round"/>
      <path d="M43.4 50.2 h3.6 v3 h-3.6 Z M53 50.2 h3.6 v3 h-3.6 Z" fill="${c}" stroke="${LINE}" stroke-width="${SWI}"/>
      <path d="M46 62 h8 v4.6 h-8 Z" fill="none" stroke="${LINE}" stroke-width="${SWI}"/>` },
  { id: 'top-turtle', label: '목폴라', price: 70,
    draw: (c) => `<path d="${TEE}" fill="${c}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M44.6 47.6 h10.8 v5 q-5.4 2.6 -10.8 0 Z" fill="${c}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>` },
  { id: 'top-hero', label: '히어로', unlock: 'rocket',
    draw: (c) => `<path d="${TEE}" fill="${c}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M50 56.6 L53.4 63 L46.6 63 Z M50 70.4 L46.6 64.4 L53.4 64.4 Z"
            fill="#ffe066" stroke="${LINE}" stroke-width="${SWI}" stroke-linejoin="round"/>` },
  { id: 'top-uniform', label: '교복', price: 100,
    draw: (c) => `<path d="${DRESS}" fill="${c}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M45 49.6 L50 56.6 L55 49.6 L53.2 48.6 L50 52.6 L46.8 48.6 Z"
            fill="#fff" stroke="${LINE}" stroke-width="${SWI}" stroke-linejoin="round"/>
      <path d="M50 56.6 L47.2 60 L50 63.4 L52.8 60 Z" fill="#e2564a" stroke="${LINE}" stroke-width="1.4"/>
      <path d="M38.4 70 C43.6 72 56.4 72 61.6 70" fill="none" stroke="${LINE}" stroke-width="${SWI}"/>` },
];

/** 신발 — 종이인형에서 발까지 갈아신기는 것이 절반의 재미다 */
export const SHOES = [
  { id: 'shoe-bare', label: '맨발', draw: () => '' },
  { id: 'shoe-sneak', label: '운동화', price: 40,
    draw: () => `
      <g stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round" fill="#fff">
        <path d="M41.2 84.6 h8.4 q1.9 0 1.9 2.3 v3.4 q0 2.3 -1.9 2.3 h-8.4 q-1.9 0 -1.9 -2.3 v-3.4 q0 -2.3 1.9 -2.3 Z"/>
        <path d="M50.4 84.6 h8.4 q1.9 0 1.9 2.3 v3.4 q0 2.3 -1.9 2.3 h-8.4 q-1.9 0 -1.9 -2.3 v-3.4 q0 -2.3 1.9 -2.3 Z"/>
      </g>
      <path d="M39.4 89.4 h11.8 M48.8 89.4 h11.8" stroke="#ff8fa3" stroke-width="2"/>` },
  { id: 'shoe-boot', label: '부츠', price: 70,
    draw: () => `
      <g stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round" fill="#9a7458">
        <path d="M43 76.6 h6.6 v12.4 q0 2.6 -2.2 2.6 h-5 q-2.2 0 -2.2 -2.6 v-1.2 q0 -2.8 2.4 -3.4 Z"/>
        <path d="M50.4 76.6 h6.6 l0 7.8 q2.4 .6 2.4 3.4 v1.2 q0 2.6 -2.2 2.6 h-5 q-2.2 0 -2.2 -2.6 Z"/>
      </g>` },
  { id: 'shoe-mary', label: '구두', price: 70,
    draw: () => `
      <g stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round" fill="#ff90b6">
        <path d="M41.4 85.4 h8.2 q1.9 0 1.9 2.2 v2.8 q0 2.2 -1.9 2.2 h-8.2 q-1.9 0 -1.9 -2.2 v-2.8 q0 -2.2 1.9 -2.2 Z"/>
        <path d="M50.4 85.4 h8.2 q1.9 0 1.9 2.2 v2.8 q0 2.2 -1.9 2.2 h-8.2 q-1.9 0 -1.9 -2.2 v-2.8 q0 -2.2 1.9 -2.2 Z"/>
      </g>
      <path d="M40.4 86.2 h10.4 M49.6 86.2 h10.4" stroke="#fff" stroke-width="1.8"/>` },
];

/** 꾸밈 — 얼굴·머리 위에 마지막으로 올라간다 */
/**
 * 꾸밈거리.
 *
 * ⚠ 왕관·천사링·별빛은 그림이 아직 없어 상점에서 걸러진다. 그런데 왕관과
 * 천사링에는 조건(crown·trophy)이 걸려 있어서, 그냥 빼면 그 조건을 채운
 * 아이가 아무것도 못 받는다. 조건을 채웠는데 빈손인 것이 물건 하나 없는
 * 것보다 나쁘다. 그림이 올 때까지 두 조건을 그림이 있는 물건 — 양갈래
 * 머리(crown)와 하트 선글라스(trophy) — 에 임시로 옮겨 두었다.
 * 그림이 오면 그 두 곳의 `unlock` 을 지우고 값을 되돌리면 된다.
 */
export const ACCS = [
  { id: 'acc-none', label: '없음', draw: () => '' },
  { id: 'acc-freckle', label: '주근깨', price: 40,
    draw: () => `
      <g fill="${LINE}" opacity=".42">
        <circle cx="34.6" cy="35.4" r=".95"/><circle cx="37.4" cy="38" r=".85"/><circle cx="32.8" cy="38.8" r=".85"/>
        <circle cx="65.4" cy="35.4" r=".95"/><circle cx="62.6" cy="38" r=".85"/><circle cx="67.2" cy="38.8" r=".85"/>
      </g>` },
  { id: 'acc-glasses', label: '안경', price: 40,
    draw: () => `
      <g fill="none" stroke="${LINE}" stroke-width="2.2">
        <rect x="31.6" y="23" width="18" height="14" rx="6.8"/>
        <rect x="50.4" y="23" width="18" height="14" rx="6.8"/>
        <path d="M49.6 29.6 L50.4 29.6"/>
      </g>` },
  { id: 'acc-pin', label: '머리핀', price: 40,
    draw: () => `
      <g transform="rotate(-16 31 13)" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round">
        <rect x="24.4" y="10.6" width="14" height="4.4" rx="2.2" fill="#ff9fc4"/>
        <circle cx="24.6" cy="12.8" r="3.1" fill="#ffd166"/>
      </g>` },
  { id: 'acc-ribbon', label: '리본', price: 60,
    draw: () => `
      <g stroke="${LINE}" stroke-width="1.9" stroke-linejoin="round">
        <path d="M50 8.6 L37.6 1.4 L37.6 15.8 Z" fill="#ff6f9d"/>
        <path d="M50 8.6 L62.4 1.4 L62.4 15.8 Z" fill="#ff6f9d"/>
        <circle cx="50" cy="8.6" r="3.6" fill="#ff9bbd"/>
      </g>` },
  { id: 'acc-sun', label: '선글라스', unlock: 'trophy',
    draw: () => `
      <g fill="#4a4152" stroke="${LINE}" stroke-width="1.9" stroke-linejoin="round">
        <rect x="31" y="23" width="18.4" height="14" rx="6.8"/>
        <rect x="50.6" y="23" width="18.4" height="14" rx="6.8"/>
      </g>
      <path d="M49.4 28.6 L50.6 28.6" stroke="${LINE}" stroke-width="2.6"/>` },
  { id: 'acc-bag', label: '가방', price: 90,
    draw: () => `
      <g stroke="${LINE}" stroke-width="2" stroke-linejoin="round">
        <path d="M64.6 56.6 h12 v10 h-12 Z" fill="#ffb3d0"/>
        <path d="M67.6 56.6 v-2.6 a3 3 0 0 1 6 0 v2.6" fill="none"/>
        <path d="M64.6 60.6 h12" fill="none"/>
      </g>` },
  { id: 'acc-headset', label: '헤드폰', price: 90,
    draw: () => `
      <path d="M28 29 C28 12 38 3.6 50 3.6 C62 3.6 72 12 72 29"
            stroke="${LINE}" stroke-width="4.6" fill="none" stroke-linecap="round"/>
      <g stroke="${LINE}" stroke-width="2" stroke-linejoin="round">
        <rect x="22.6" y="23" width="10.6" height="14.4" rx="4.8" fill="#ff8a8a"/>
        <rect x="66.8" y="23" width="10.6" height="14.4" rx="4.8" fill="#ff8a8a"/>
      </g>` },
  { id: 'acc-flower', label: '꽃장식', price: 110,
    draw: () => `
      <g transform="translate(30 11)" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round">
        <g fill="#ff8fc0">
          <ellipse cx="0" cy="-5.2" rx="3.6" ry="4.6"/>
          <ellipse cx="5" cy="-1.6" rx="3.6" ry="4.6" transform="rotate(72 5 -1.6)"/>
          <ellipse cx="3.1" cy="4.6" rx="3.6" ry="4.6" transform="rotate(144 3.1 4.6)"/>
          <ellipse cx="-3.1" cy="4.6" rx="3.6" ry="4.6" transform="rotate(216 -3.1 4.6)"/>
          <ellipse cx="-5" cy="-1.6" rx="3.6" ry="4.6" transform="rotate(288 -5 -1.6)"/>
        </g>
        <circle cx="0" cy="0" r="2.9" fill="#ffd45e"/>
      </g>` },
  { id: 'acc-crown', label: '왕관', unlock: 'crown',
    draw: () => `
      <path d="M34.6 15 L36.6 2 L43.6 10 L50 0.6 L56.4 10 L63.4 2 L65.4 15 Z"
            fill="#ffd45e" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="50" cy="9.4" r="2.2" fill="#ff5f8d" stroke="${LINE}" stroke-width="1.3"/>` },
  { id: 'acc-halo', label: '천사링', unlock: 'trophy',
    draw: () => `
      <ellipse cx="50" cy="1.6" rx="12.6" ry="3.8" fill="none" stroke="#ffd45e" stroke-width="4"/>
      <ellipse cx="50" cy="1.6" rx="12.6" ry="3.8" fill="none" stroke="${LINE}" stroke-width="1.4"/>` },
  { id: 'acc-star', label: '별빛', unlock: 'rainbow',
    draw: () => `
      <g fill="#ffe066" stroke="${LINE}" stroke-width="1.4" stroke-linejoin="round">
        <path d="M16.6 12 l2.2 4.8 4.8 2.2 -4.8 2.2 -2.2 4.8 -2.2 -4.8 -4.8 -2.2 4.8 -2.2 Z"/>
        <path d="M83.4 20 l1.6 3.5 3.5 1.6 -3.5 1.6 -1.6 3.5 -1.6 -3.5 -3.5 -1.6 3.5 -1.6 Z"/>
        <path d="M79 3 l1.3 2.8 2.8 1.3 -2.8 1.3 -1.3 2.8 -1.3 -2.8 -2.8 -1.3 2.8 -1.3 Z"/>
      </g>` },
];

export const BGS = [
  { id: 'bg-lilac',  label: '라일락', color: '#f2edff' },
  { id: 'bg-mint',   label: '민트',   color: '#e4f8f0', price: 30 },
  { id: 'bg-sky',    label: '하늘',   color: '#e6f2fd', price: 30 },
  { id: 'bg-cream',  label: '크림',   color: '#fef5e2', price: 30 },
  { id: 'bg-peach',  label: '복숭아', color: '#ffeae4', price: 30 },
  { id: 'bg-night',  label: '한밤',   color: '#414a66', price: 80 },
  { id: 'bg-rainbow', label: '무지개',
    color: 'linear-gradient(140deg,#ffe0e9,#fff3d8,#e0f8ec,#e6f1ff)', unlock: 'rainbow' },
  { id: 'bg-space',  label: '우주',
    color: 'linear-gradient(160deg,#33366e,#6b4aa0)', unlock: 'medal' },
];

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
export const INDEX = {
  skin: byId(SKINS), hairColor: byId(HAIR_COLORS), hair: byId(HAIRS), face: byId(FACES),
  eyeColor: byId(EYE_COLORS), topColor: byId(TOP_COLORS), top: byId(TOPS),
  shoe: byId(SHOES), acc: byId(ACCS), bg: byId(BGS),
};

export const DEFAULT_LOOK = {
  skin: 'skin-2', hair: 'hair-bob', hairColor: 'hc-black', face: 'face-smile',
  eyeColor: 'ec-brown', top: 'top-tee', topColor: 'tc-mint',
  shoe: 'shoe-bare', acc: 'acc-none', bg: 'bg-lilac',
};

function resolve(look) {
  const L = { ...DEFAULT_LOOK, ...(look || {}) };
  return {
    skin: INDEX.skin[L.skin] || SKINS[1],
    hairColor: INDEX.hairColor[L.hairColor] || HAIR_COLORS[0],
    topColor: INDEX.topColor[L.topColor] || TOP_COLORS[0],
    eyeColor: INDEX.eyeColor[L.eyeColor] || EYE_COLORS[0],
    hair: INDEX.hair[L.hair] || HAIRS[1],
    face: INDEX.face[L.face] || FACES[0],
    top: INDEX.top[L.top] || TOPS[0],
    shoe: INDEX.shoe[L.shoe] || SHOES[0],
    acc: INDEX.acc[L.acc] || ACCS[0],
    bg: INDEX.bg[L.bg] || BGS[0],
  };
}

/**
 * 아바타 SVG.
 *
 * 그리는 순서가 곧 앞뒤 순서다. 배경 → 뒷머리 → 다리·신발 → 팔 → 몸 → 속옷 →
 * 옷 → 목 → 얼굴 → 이목구비 → 앞머리 → 꾸밈.
 * 하나라도 바꾸면 머리카락이 얼굴을 덮거나 옷이 팔 뒤로 숨는다.
 */
export function svgMarkup(look, { bg = true } = {}) {
  const r = resolve(look);
  const sk = r.skin.color;
  const hc = r.hairColor;
  const c = { eye: r.eyeColor.color, eyeDark: r.eyeColor.dark, brow: hc.dark };
  const flat = !String(r.bg.color).startsWith('linear');
  const body = `fill="${sk}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"`;
  // 머리·꾸밈은 옛 두상 좌표라 HEAD_FIT 으로 옮긴다. 선 굵기는 안 늘어나게 고정.
  const fit = (inner) => `<g transform="${HEAD_FIT}" vector-effect="non-scaling-stroke">${inner}</g>`;
  const hairOut = `stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="av-svg" aria-hidden="true">
  ${bg && flat ? `<rect width="100" height="100" fill="${r.bg.color}"/>` : ''}
  ${r.hair.back ? fit(`<path d="${r.hair.back}" fill="${hc.dark}" ${hairOut}/>`) : ''}
  <path d="${LEG_L}" ${body}/>
  <path d="${LEG_R}" ${body}/>
  <path d="${FOOT_L}" ${body}/>
  <path d="${FOOT_R}" ${body}/>
  ${r.shoe.draw()}
  <path d="${ARM_L}" ${body}/>
  <path d="${ARM_R}" ${body}/>
  <path d="${HAND_L}" ${body}/>
  <path d="${HAND_R}" ${body}/>
  <path d="${TORSO}" ${body}/>
  <path d="${UNDIES}" fill="#ffdfe8" stroke="${LINE}" stroke-width="${SWI}" stroke-linejoin="round"/>
  ${r.top.draw(r.topColor.color)}
  <path d="${HEAD}" ${body}/>
  ${r.face.draw(c)}
  ${r.hair.front ? fit(`<path d="${r.hair.front}" fill="${hc.color}" ${hairOut}/>`) : ''}
  ${r.hair.hi ? fit(`<path d="${r.hair.hi}" fill="${hc.hi}"/>`) : ''}
  ${r.hair.lines ? fit(`<path d="${r.hair.lines}" fill="none" stroke="${hc.dark}"
       stroke-width="1.3" stroke-linecap="round" opacity=".35" vector-effect="non-scaling-stroke"/>`) : ''}
  ${r.acc.draw() ? fit(r.acc.draw()) : ''}
</svg>`;
}

/** 배경색만 (그라데이션인 경우가 있어 컨테이너가 칠한다) */
export function bgOf(look) { return resolve(look).bg.color; }
