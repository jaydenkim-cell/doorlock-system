// ─────────────────────────────────────────────────────────────
// 최정숙 할머니의 칠순여행 — 확정 콘텐츠 상수 (v7 · 더 이루투어 패키지)
// 일정/결제/경비/준비물의 "정의"는 여기서 관리하고,
// 입금 체크·준비물 체크·메모 등 "변하는 값"만 store(Supabase)에 저장한다.
//
// 자유여행(렌터카·에어비앤비·온나손) → 올인클루시브 패키지로 확정되면서
// 일정은 여행사가 정한 고정 일정이 되었다. 앱에서 임의로 바꾸지 않는다.
// ─────────────────────────────────────────────────────────────

export const TRIP = {
  title: "최정숙 할머니의 칠순여행",
  subtitle: "오키나와 2박 3일 · 가족 8명",
  startDate: "2026-10-24", // 1일차 (D-day 기준)
  endDate: "2026-10-26",
  destination: "일본 오키나와 (나하 IN/OUT)",
  party: "8명 — 70대 2분, 40대 4명, 초등학생 2명",
  agency: {
    name: "더 이루투어",
    manager: "김갑중 이사",
    phone: "070-7767-0119",
  },
  hotel: "휴잇트 리조트 나하 (2연박)",
  meet: {
    // 여행사가 집결 시각을 확정해 주면 "07:15" 처럼 채운다.
    // 확정 전에는 null — 항공 스케줄에서 역산한 추정치를 넣지 않는다.
    // (예전 08:30 은 11:30 출발 기준이라 09:45 출발에는 맞지 않는다.)
    time: null as string | null,
    place: "인천공항 제1터미널 · 진에어 수속 카운터 앞",
    pendingNote: "집결 시각은 여행사 확정 연락 예정",
  },
} as const;

/**
 * 항공 스케줄. 일정 타임라인과 정보 카드가 같은 값을 보게 해서
 * 한쪽만 고쳐져 어긋나는 일을 막는다. (2026-08-03 이스타 → 진에어 변경)
 */
export const FLIGHTS = {
  out: { no: "진에어 LJ341", date: "10/24", dep: "09:45", arr: "12:05", from: "인천", to: "나하" },
  back: { no: "진에어 LJ396", date: "10/26", dep: "13:35", arr: "15:55", from: "나하", to: "인천" },
  durationText: "직항 약 2시간 20분 · 시차 없음",
};

export type Coord = { lat: number; lng: number };

// 주요 장소 좌표 (지도 핀용)
export const PLACES: Record<string, Coord> = {
  나하공항: { lat: 26.1958, lng: 127.6459 },
  우미카지테라스: { lat: 26.1758, lng: 127.6522 },
  슈리성: { lat: 26.217, lng: 127.7195 },
  국제거리: { lat: 26.2151, lng: 127.6847 },
  휴잇트리조트나하: { lat: 26.2135, lng: 127.689 },
  츄라우미수족관: { lat: 26.6943, lng: 127.878 },
  나고파인애플파크: { lat: 26.6165, lng: 127.9696 },
  아메리칸빌리지: { lat: 26.3159, lng: 127.754 },
  나미노우에신사: { lat: 26.2178, lng: 127.6672 },
  니라이카나이대교: { lat: 26.161, lng: 127.804 },
  치넨미사키공원: { lat: 26.1683, lng: 127.8283 },
};

export type DayNo = 1 | 2 | 3;

/**
 * 일정 한 칸.
 * time 이 있으면 = 여행사가 확정해 준 시각(항공). 시계로 표시한다.
 * timePending 이면 = 시각이 정해져야 하는데 아직 안 나온 항목. '미정'으로 표시한다.
 * 둘 다 없으면 = 시각 개념이 없는 방문지. 순서 번호로만 표시한다.
 *   ※ 패키지 일정표에 없는 시각을 앱이 지어내지 않는다.
 */
export type PlanEvent = {
  id: string;
  day: DayNo;
  time?: string;
  timePending?: boolean;
  title: string;
  place?: keyof typeof PLACES;
  memo?: string;
  /** 🎂 칠순 하이라이트 강조 */
  highlight?: boolean;
};

export const DAY_META: Record<DayNo, { label: string; theme: string }> = {
  1: { label: "10/24 (토)", theme: "출발 & 남부 관광" },
  2: { label: "10/25 (일)", theme: "북부 하이라이트" },
  3: { label: "10/26 (월)", theme: "남부 절경 & 출국" },
};

export const PLAN: PlanEvent[] = [
  // ── Day 1 (10/24 토) 출발 & 남부 관광 ──
  {
    id: "d1-meet",
    day: 1,
    timePending: true,
    title: "인천공항 제1터미널 집결",
    memo:
      "진에어 수속 카운터 앞에서 로컬 가이드 미팅. 사전 체크인은 여행사가 진행합니다. " +
      "집결 시각은 여행사에서 확정 연락 예정입니다.",
  },
  {
    id: "d1-fly",
    day: 1,
    time: FLIGHTS.out.dep,
    title: `${FLIGHTS.out.from} 출발 → ${FLIGHTS.out.to} 도착 ${FLIGHTS.out.arr}`,
    place: "나하공항",
    memo: `${FLIGHTS.out.no} · ${FLIGHTS.durationText}`,
  },
  {
    id: "d1-umikaji",
    day: 1,
    title: "우미카지 테라스",
    place: "우미카지테라스",
    memo: "세나가섬의 '오키나와 산토리니'. 바다 전망 계단식 카페·상점가.",
  },
  {
    id: "d1-shuri",
    day: 1,
    title: "슈리성",
    place: "슈리성",
    memo: "류큐 왕국의 상징 · 유네스코 세계유산 (정전 관람은 불포함)",
  },
  {
    id: "d1-kokusai",
    day: 1,
    title: "국제거리 & 공설시장",
    place: "국제거리",
    memo: "오키나와 최대 번화가 '기적의 1마일'",
  },
  {
    id: "d1-dinner",
    day: 1,
    title: "🎂 석식 · 철판 스테이크 (셈즈 앙카인 국제거리점)",
    place: "국제거리",
    memo: "칠순 축하 디너 — 케이크·축하상은 미리 요청해 두세요.",
    highlight: true,
  },
  {
    id: "d1-hotel",
    day: 1,
    title: "휴잇트 리조트 나하 체크인",
    place: "휴잇트리조트나하",
    memo: "2연박이라 숙소 이동이 없습니다.",
  },

  // ── Day 2 (10/25 일) 북부 하이라이트 ──
  { id: "d2-morning", day: 2, title: "호텔 조식 후 가이드 미팅", memo: "로비에서 출발" },
  {
    id: "d2-churaumi",
    day: 2,
    title: "츄라우미 수족관",
    place: "츄라우미수족관",
    memo: "고래상어 대수조 · 일본 최대 규모. 실내라 어르신·아이 모두에게 이번 여행의 하이라이트.",
  },
  {
    id: "d2-lunch",
    day: 2,
    title: "중식 · 츄라하나 (도반야키)",
    memo: "일본식 가정식 현지 특식",
  },
  {
    id: "d2-pineapple",
    day: 2,
    title: "나고 파인애플파크",
    place: "나고파인애플파크",
    memo: "자율주행 카트 '파인애플호' — 아이들에게 인기",
  },
  {
    id: "d2-american",
    day: 2,
    title: "아메리칸 빌리지",
    place: "아메리칸빌리지",
    memo: "샌디에이고 컨셉 복합 타운 · 선셋비치 노을",
  },
  {
    id: "d2-dinner",
    day: 2,
    title: "🎂 석식 · 야키니쿠 다베호다이 (고기 뷔페)",
    memo: "둘째 날 축하 자리",
    highlight: true,
  },
  {
    id: "d2-hotel",
    day: 2,
    title: "휴잇트 리조트 나하 (연박)",
    place: "휴잇트리조트나하",
  },

  // ── Day 3 (10/26 월) 남부 절경 & 출국 ──
  { id: "d3-checkout", day: 3, title: "호텔 조식 후 체크아웃", memo: "짐 정리 후 출발" },
  {
    id: "d3-naminoue",
    day: 3,
    title: "나미노우에 신사",
    place: "나미노우에신사",
    memo: "절벽 위 신사 · 나하 시내와 바다 전망",
  },
  {
    id: "d3-nirai",
    day: 3,
    title: "니라이카나이 대교",
    place: "니라이카나이대교",
    memo: "거대한 S자 곡선 절경 드라이브 코스",
  },
  {
    id: "d3-chinen",
    day: 3,
    title: "치넨미사키 공원",
    place: "치넨미사키공원",
    memo: "태평양 270도 파노라마 바다 전망",
  },
  { id: "d3-lunch", day: 3, title: "중식 · 현지식" },
  {
    id: "d3-fly",
    day: 3,
    time: FLIGHTS.back.dep,
    title: `${FLIGHTS.back.from} 출발 → ${FLIGHTS.back.to} 도착 ${FLIGHTS.back.arr}`,
    place: "나하공항",
    memo: `${FLIGHTS.back.no} · 행사 종료`,
  },
];

// ── 결제 · 입금 체크 (§4) ──
export type PaymentItem = {
  key: string;
  household: string;
  kind: "예약금" | "잔금";
  /** 만원 단위 */
  amount: number;
  note: string;
};

// ※ 예전 자유여행 예약 체크가 되살아나지 않도록 새 키를 쓴다.
export const PAYMENTS: PaymentItem[] = [
  {
    key: "pay-chae-deposit",
    household: "채이네",
    kind: "예약금",
    amount: 250,
    note: "성인 3(부부 + 할머니) · 초등 1 → 65만 × 3 + 55만",
  },
  {
    key: "pay-chae-balance",
    household: "채이네",
    kind: "잔금",
    amount: 267,
    note: "집 합계 517만 − 예약금 250만",
  },
  {
    key: "pay-jiho-deposit",
    household: "지호네",
    kind: "예약금",
    amount: 250,
    note: "성인 3(부부 + 할아버지) · 초등 1 → 65만 × 3 + 55만",
  },
  {
    key: "pay-jiho-balance",
    household: "지호네",
    kind: "잔금",
    amount: 267,
    note: "집 합계 517만 − 예약금 250만",
  },
];

// ── 패키지 단가 · 집별 분담 (§4) 만원 단위 ──
export const PACKAGE = {
  adultPrice: 132,
  childPrice: 121,
  adults: 6,
  children: 2,
  depositAdult: 65,
  depositChild: 55,
  households: [
    {
      name: "채이네",
      members: "부부(성인2) + 아이(초등1) + 할머니(성인1)",
      total: 517,
      deposit: 250,
      balance: 267,
    },
    {
      name: "지호네",
      members: "부부(성인2) + 아이(초등1) + 할아버지(성인1)",
      total: 517,
      deposit: 250,
      balance: 267,
    },
  ],
  included: [
    "왕복 항공 (진에어) · 택스 · 유류할증",
    "여행자보험 (최대 1억)",
    "전 일정 식사",
    "표기 입장료 (츄라우미 · 나고 파인애플파크 등)",
    "전담 로컬 가이드 · 전용버스",
    "석식 2회 특식 (철판 스테이크 · 야키니쿠 뷔페)",
  ],
  excluded: ["개인 경비", "가이드 · 기사 팁 (인당 약 5만원 예상)"],
};

// ── 준비물 체크리스트 (§5) ──
// key 에 p7- 접두어: 예전 자유여행 체크 상태와 섞이지 않게 한다.
export const PACKING: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "서류 (가장 중요)",
    items: [
      { key: "p7-passport", label: "여권 8명 (유효기간 6개월 이상)" },
      { key: "p7-voucher", label: "여행사 서류 수령 (일정표·항공권·이름표) — 당일 공항" },
    ],
  },
  {
    group: "준비",
    items: [
      { key: "p7-esim", label: "eSIM 개통 / 포켓와이파이" },
      { key: "p7-cash", label: "엔화 환전 + 가이드·기사 팁용 현금" },
      { key: "p7-meds", label: "어르신 상비약 · 복용약" },
      { key: "p7-charger", label: "멀티탭 · 충전기 (일본 A타입)" },
      { key: "p7-umbrella", label: "우산 · 우비 (10월 말 대비)" },
      { key: "p7-gold", label: "고가 금·귀금속은 한국 보관 (일본 세관 주의)" },
    ],
  },
  {
    group: "칠순 특별",
    items: [
      { key: "p7-cake", label: "🎂 1일차 스테이크 석식에 케이크·축하 요청" },
      { key: "p7-snack", label: "아이 간식 · 기내 장난감" },
      { key: "p7-photo", label: "가족사진 촬영 계획 (슈리성 · 치넨미사키)" },
    ],
  },
];

// ── 정보 카드 (§6) ──
export const INFO_CARDS = [
  {
    icon: "✈️",
    title: "항공편",
    body:
      `${FLIGHTS.out.no} · ${FLIGHTS.out.date} ${FLIGHTS.out.dep} ${FLIGHTS.out.from} → ${FLIGHTS.out.arr} ${FLIGHTS.out.to} / ` +
      `${FLIGHTS.back.no} · ${FLIGHTS.back.date} ${FLIGHTS.back.dep} ${FLIGHTS.back.from} → ${FLIGHTS.back.arr} ${FLIGHTS.back.to}.`,
  },
  {
    icon: "📣",
    title: "집결 (중요)",
    body: `${TRIP.meet.place}. 집결 시각은 여행사 확정 연락 예정 — 나오는 대로 여기에 표시됩니다. 사전 체크인은 여행사가 진행합니다.`,
  },
  { icon: "🏨", title: "호텔", body: "휴잇트 리조트 나하 2연박. 숙소 이동이 없어 짐을 풀어둘 수 있습니다." },
  { icon: "🚌", title: "가이드 · 교통", body: "전담 로컬 가이드 + 전용버스. 자가운전이 없어 운전 부담이 없습니다." },
  {
    icon: "✅",
    title: "포함",
    body: "항공·택스·유류할증, 여행자보험 1억, 전 일정 식사, 표기 입장료, 가이드·전용버스, 특식 2회.",
  },
  { icon: "💸", title: "불포함", body: "개인 경비 + 가이드·기사 팁. 인당 약 5만원 현금으로 미리 준비하세요." },
  { icon: "📞", title: "담당자", body: "더 이루투어 김갑중 이사 · 070-7767-0119" },
  {
    icon: "🚨",
    title: "세관 주의",
    body: "일본 세관 금·귀금속 규정 (면세 20만엔). 고가 액세서리는 한국에 두고 가시는 편이 안전합니다.",
  },
];
