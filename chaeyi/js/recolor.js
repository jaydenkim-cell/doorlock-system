/**
 * 부위 그림에 색 입히기
 *
 * 그림은 한 벌만 있고 색은 아이가 고른다. 머리 모양 7개 × 머리색 12개를
 * 84장 만들어 두는 대신, 화면에 그릴 때 색을 바꾼다. 파일이 12배로 늘지
 * 않으니 앱이 가벼워지고, 색을 하나 더 넣고 싶을 때 그림을 다시 안 받아도 된다.
 *
 * 원리는 **밝기 비율만 옮기는 것**이다. 그림을 받을 때 "음영 없이 평평하게
 * 칠해 달라"고 한 이유가 이것이다. 칠이 평평하면 원래 색 대비 밝기 비율에
 * 목표 색을 곱해 주기만 하면 되고, 검은 윤곽선은 밝기가 0 이라 곱해도 0 —
 * 저절로 검게 남는다. 경계의 흐린 픽셀도 비율대로 따라온다.
 *
 * 그런데 전부 그렇게 하면 안 되는 곳이 있다. 몸통을 통째로 옮기면 검은
 * 눈동자의 흰 반짝임까지 살구색으로 물들고, 교복을 통째로 옮기면 흰 셔츠와
 * 빨간 리본까지 같이 변한다. 그래서 **어떤 픽셀을 옮길지** 고르는 방법을
 * 세 가지 둔다.
 *
 *   ratio  전부      — 머리카락. 색이 한 가지뿐이라 다 옮겨도 된다
 *   warm   살색만    — 몸통. 눈·윤곽선·눈 흰자는 그대로 두어야 한다
 *   near   비슷한 색 — 옷. 대표색만 옮기면 교복 조끼는 변하고 흰 셔츠는 남는다
 *
 * 결과는 캐시한다. 같은 그림·같은 색을 다시 칠하는 일이 잦다 (홈 화면에
 * 얼굴이 여러 개 뜬다).
 */

const cache = new Map();
const inflight = new Map();

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/** 이 그림에 이 색을 칠한 결과를 가리키는 이름 */
function keyOf(src, spec) {
  return `${src}|${spec.mode}|${spec.from}|${spec.to}`;
}

/** 색을 안 바꿔도 되는 경우인가 (원래 색 그대로거나 칠할 것이 없거나) */
function idle(spec) {
  return !spec || !spec.to || !spec.from ||
         spec.to.toLowerCase() === spec.from.toLowerCase();
}

/**
 * 이미 칠해 둔 것이 있으면 바로 준다. 없으면 null.
 * 화면을 먼저 그리고 색은 나중에 채우기 위해 동기 조회가 따로 필요하다.
 */
export function ready(src, spec) {
  if (idle(spec)) return src;
  return cache.get(keyOf(src, spec)) || null;
}

/** 픽셀을 실제로 옮긴다. 색 종류가 몇 개 안 되므로 한 번 계산한 것은 기억해 둔다. */
function paint(data, spec) {
  const [sr, sg, sb] = hex(spec.from);
  const [dr, dg, db] = hex(spec.to);
  const sl = luma(sr, sg, sb) || 1;
  const memo = new Map();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const k = (r << 16) | (g << 8) | b;
    let v = memo.get(k);
    if (v === undefined) {
      let move;
      if (spec.mode === 'warm') {
        // 살색: 빨강이 제일 세고 파랑이 제일 약한 픽셀. 검은 눈과 흰 반짝임은 걸러진다
        move = r >= g && g >= b && r > 110 && r - b > 18;
      } else if (spec.mode === 'near') {
        move = Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb) <= (spec.tol || 95);
      } else {
        move = true;
      }
      if (move) {
        const t = luma(r, g, b) / sl;
        v = [Math.min(255, dr * t | 0), Math.min(255, dg * t | 0), Math.min(255, db * t | 0)];
      } else {
        v = [r, g, b];
      }
      memo.set(k, v);
    }
    data[i] = v[0]; data[i + 1] = v[1]; data[i + 2] = v[2];
  }
}

/** 그림을 불러 색을 칠하고, 그릴 수 있는 주소를 돌려준다. */
export function tint(src, spec) {
  if (idle(spec)) return Promise.resolve(src);
  const key = keyOf(src, spec);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const busy = inflight.get(key);
  if (busy) return busy;

  const job = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height);
        paint(d.data, spec);
        ctx.putImageData(d, 0, 0);
        const url = c.toDataURL('image/png');
        cache.set(key, url);
        resolve(url);
      } catch (e) {
        // 캔버스를 못 쓰는 환경이면 원래 그림이라도 보여 준다 (색만 원래대로)
        resolve(src);
      }
      inflight.delete(key);
    };
    img.onerror = () => { inflight.delete(key); resolve(src); };
    img.src = src;
  });
  inflight.set(key, job);
  return job;
}

/** 시험·디버깅용 — 칠해 둔 것을 비운다 */
export function clear() { cache.clear(); inflight.clear(); }
