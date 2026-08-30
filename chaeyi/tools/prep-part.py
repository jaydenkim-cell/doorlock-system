#!/usr/bin/env python3
"""생성 AI 가 준 부위 그림을 앱에 쓸 수 있는 PNG 로 다듬는다.

    python3 chaeyi/tools/prep-part.py 받은그림.png chaeyi/assets/parts/hair/bob.png

── 왜 이 도구가 필요한가 ─────────────────────────────────────────────
그림 생성 AI 는 **알파 채널을 만들지 못한다.** '배경을 투명하게' 라고 시키면
투명을 뜻하는 회색 체크무늬를 그대로 *그려서* RGB 로 저장해 버린다.
눈으로는 투명해 보이지만 파일에는 회색 격자가 박혀 있어서, 그대로 얹으면
아바타 뒤에 체크무늬 판이 깔린다.

색만 보고 지우면 눈 흰자·흰 옷까지 날아간다. 그래서 두 단계로 판단한다.
  1) 무채색이고 밝은 픽셀을 연결 요소로 묶는다
  2) 그 덩어리 안에서 흰색과 회색이 반반씩 나오는지 본다
     — 체크무늬 배경은 48:51 로 갈리고, 눈 흰자 같은 단색은 100:0 이다.

테두리에서 이어지는지가 아니라 무늬인지로 보기 때문에, 단발머리 안쪽
얼굴 구멍처럼 바깥과 막혀 있는 배경도 같이 지워진다.
"""
import argparse
from collections import deque
from PIL import Image


def dekey(im, lum=195, spread=14, minshare=0.25, minsize=400):
    """체크무늬 배경을 알파 0 으로 만든다."""
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()

    def neutral(x, y):
        r, g, b = px[x, y]
        return max(r, g, b) - min(r, g, b) <= spread and (r + g + b) / 3 >= lum

    seen = bytearray(w * h)
    out = im.convert('RGBA')
    a = out.load()

    for sy in range(h):
        base = sy * w
        for sx in range(w):
            if seen[base + sx] or not neutral(sx, sy):
                continue
            comp, q = [], deque([(sx, sy)])
            seen[base + sx] = 1
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and neutral(nx, ny):
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))
            if len(comp) < minsize:
                continue
            white = sum(1 for x, y in comp if px[x, y][0] > 240)
            grey = sum(1 for x, y in comp if px[x, y][0] <= 235)
            n = len(comp)
            if white / n >= minshare and grey / n >= minshare:
                for x, y in comp:
                    r, g, b, _ = a[x, y]
                    a[x, y] = (r, g, b, 0)
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument('src')
    p.add_argument('dst')
    p.add_argument('--size', type=int, default=512, help='최종 정사각 크기')
    p.add_argument('--colors', type=int, default=64, help='팔레트 색 수 (0 이면 그대로)')
    args = p.parse_args()

    im = dekey(Image.open(args.src))
    if im.size != (args.size, args.size):
        im = im.resize((args.size, args.size), Image.LANCZOS)
    if args.colors:
        im = im.quantize(colors=args.colors, method=Image.FASTOCTREE).convert('RGBA')
    im.save(args.dst, optimize=True)

    box = im.getchannel('A').getbbox()
    print(f'{args.dst}  {args.size}x{args.size}  그림 영역 {box}')
    if box:
        cx = (box[0] + box[2]) / 2
        print(f'  가로 중심 {cx:.0f} (캔버스 중심 {args.size/2:.0f})  '
              f'위 {box[1]}  아래 {box[3]}')
        if abs(cx - args.size / 2) > args.size * 0.02:
            print('  ⚠ 가로 중심이 캔버스 중심에서 벗어났다 — 다른 부위와 안 맞을 수 있다')


if __name__ == '__main__':
    main()
