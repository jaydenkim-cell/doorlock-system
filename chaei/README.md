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

## 테스트

```bash
node chaei/test/logic.test.mjs                    # 생성기·SRS·세션 엔진 (브라우저 불필요)

npm install playwright --no-save                  # 브라우저 시나리오
CHROMIUM=<크로미움 경로> node chaei/test/ui.test.mjs /tmp/shots
```

## 구조

```
index.html            앱 셸
sw.js                 오프라인 캐시
css/app.css           디자인 토큰 + 화면 스타일
js/
  state.js            저장소·프로필·진도 (스키마 버전 + 마이그레이션 훅)
  srs.js              Leitner 간격 반복
  session.js          한 판 진행 · 문항 선택 · 중단 복구
  feedback.js         소리·진동 (WebAudio 합성, 외부 파일 없음)
  ko.js               한국어 조사 처리
  generators/         문항 생성기 (곱셈구구 / 받아올림·받아내림)
  ui/screens/         온보딩 · 홈 · 세션 · 결과 · 부모
data/curriculum.json  2022 개정 교육과정 매핑
docs/PLAN.md          기획서
```

## 새 단원 추가하기

`js/generators/` 에 파일 하나를 만들고 아래를 내보내면 세션 엔진이 그대로 굴러간다.

```
id, title, emoji
allFacts()              학습 항목 키 목록
groups()                홈 화면에 묶어 보여줄 단위
makeQuestion(key, box)  { prompt, answer, mode, choices?, ctx?, hint }
diagnose(key, given, ctx)  오답을 사람이 읽을 수 있는 이름으로
parseFact(key), answerOf(key)
```

그 다음 `session.js` 의 `SKILLS` 에 등록하고 `sw.js` 캐시 목록에 파일을 추가한다.
