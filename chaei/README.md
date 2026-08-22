# 채이 수학

초등 2학년을 위한 곱셈구구 · 받아올림/받아내림 연습 PWA.
빌드 도구 없는 바닐라 HTML/CSS/JS, 기록은 기기 안에만 저장된다.

기획 배경과 설계 근거는 **[docs/PLAN.md](docs/PLAN.md)** 에 있다.
Duolingo의 하트·스트릭을 왜 버렸는지, 오답 선지를 왜 무작위로 만들지 않는지가 거기 적혀 있다.

## 실행

```bash
python3 -m http.server 7777      # 저장소 루트에서
# → http://localhost:7777/chaei/
```

태블릿에서 열고 홈 화면에 추가하면 앱처럼 쓸 수 있다 (오프라인 동작).

## Vercel 배포

이 폴더만 배포된다. 저장소의 나머지(도어락 시스템)는 올라가지 않는다.

1. Vercel → **Add New… → Project** → 이 저장소 선택
2. **Root Directory** 를 `chaei` 로 지정 — 이게 핵심이다
3. Framework Preset `Other`, Build Command 비움, Output Directory 비움
4. **Settings → Git → Production Branch** 를 배포할 브랜치로 지정

`vercel.json` 이 `sw.js` 에 no-cache 를 걸어 둔다.
이게 없으면 앱을 고쳐도 태블릿에 새 버전이 영영 내려가지 않는다.
`.vercelignore` 로 `test/`, `docs/` 는 배포에서 제외된다.

배포된 주소를 태블릿에서 열고 `홈 화면에 추가` 하면 앱처럼 쓸 수 있다
(아이패드는 Safari 공유 버튼, 안드로이드는 Chrome ⋮ 메뉴).

## 단일 파일로 묶기

링크 하나로 건네거나 파일로 전달할 때 쓴다.

```bash
npm install esbuild playwright --no-save
node chaei/build-standalone.mjs
#   dist/chaei-standalone.html   완전한 문서. 아무 정적 호스팅에나 올리거나 파일로 전달
#   dist/chaei-artifact.html     문서 골격 없는 본문만
```

모듈을 그냥 이어 붙일 수는 없다. `multiply.js` 와 `addsub.js` 가 둘 다
`id` / `title` / `emoji` 를 export 하기 때문에 모듈 스코프를 지키는 번들러가 필요하다.

단일 파일에는 `sw.js` 가 없으므로 서비스워커 등록이 빠진다(오프라인 미지원).
제대로 쓰려면 Vercel 배포 쪽을 쓴다.

## 테스트

```bash
node chaei/test/logic.test.mjs                    # 생성기·SRS·세션 엔진 (브라우저 불필요)

# 주의: package.json 이 없어서 --no-save 로 하나씩 설치하면 앞서 깔린 게 지워진다.
#      두 개를 한 번에 설치할 것.
npm install esbuild playwright --no-save          # 브라우저 시나리오
CHROMIUM=<크로미움 경로> node chaei/test/ui.test.mjs /tmp/shots

# 루트로 서빙되는 배포 환경과 동일하게 테스트하려면
APP_URL=http://localhost:7788/ CHROMIUM=<경로> node chaei/test/ui.test.mjs /tmp/shots

# 단일 파일 빌드 검증 (manifest·서비스워커·오프라인 3개는 해당 없어 건너뜀)
BUNDLE=1 APP_URL=http://localhost:7799/chaei-standalone.html \
  CHROMIUM=<경로> node chaei/test/ui.test.mjs /tmp/shots
```

## 구조

```
build-standalone.mjs  단일 HTML 빌드 (esbuild)
vercel.json           배포 헤더 (서비스워커 no-cache)
index.html            앱 셸
sw.js                 오프라인 캐시
css/app.css           디자인 토큰 + 화면 스타일
js/
  state.js            저장소·프로필·진도 (스키마 버전 + 마이그레이션 훅)
  srs.js              Leitner 간격 반복
  difficulty.js       자동 난이도 레벨 + 부모 프리셋
  allowance.js        용돈 저금통 (적립·지급·내역)
  session.js          한 판 진행 · 문항 선택 · 중단 복구
  feedback.js         소리·진동 (WebAudio 합성, 외부 파일 없음)
  ko.js               한국어 조사 처리
  generators/         문항 생성기 (곱셈구구 / 받아올림·받아내림)
  ui/screens/         온보딩 · 진단 · 홈 · 세션 · 결과 · 랠리 · 부모
data/curriculum.json  2022 개정 교육과정 매핑
docs/PLAN.md          기획서
```

## 새 단원 추가하기

`js/generators/` 에 파일 하나를 만들고 아래를 내보내면 세션 엔진이 그대로 굴러간다.

```
id, title, emoji
allFacts()              학습 항목 키 목록
groups()                홈 화면에 묶어 보여줄 단위
VARIANTS                [{ id, minLevel, weight }] 문제 형태 목록
canUse(variantId, key)  이 형태를 이 문항에 쓸 수 있는가
newFactOrder()          처음 배울 때의 순서 (allFacts 순서와 별개)
placementFacts()        진단 판 대표 문항
makeQuestion(key, box, variant)
                        { prompt, answer, mode, render, choices?, ctx?, hint }
                        render = { type:'expr'|'sequence'|'groups', … }
                        형태가 무엇이든 factKey 는 유지해야 한다
diagnose(key, given, ctx)  오답을 사람이 읽을 수 있는 이름으로
parseFact(key), answerOf(key)
```

그 다음 `session.js` 의 `SKILLS` 에 등록하고 `sw.js` 캐시 목록에 파일을 추가한다.
