// ─────────────────────────────────────────────────────────────
// 최정숙 할머니의 칠순여행 — 확정 콘텐츠 상수 (v8 · 여행사 최종 일정표 기준)
// 일정/결제/경비/준비물의 "정의"는 여기서 관리하고,
// 입금 체크·준비물 체크·메모 등 "변하는 값"만 store(Supabase)에 저장한다.
//
// 출처: 더 이루투어 「20261024 오키나와 3일(김강현 팀장, 진에어)」 최종 일정표.
// 이 파일의 값은 그 문서를 그대로 옮긴 것이다. 문서에 없는 시각·내용은 만들지 않는다.
// ─────────────────────────────────────────────────────────────

export const TRIP = {
  title: "최정숙 할머니의 칠순여행",
  subtitle: "오키나와 2박 3일 · 가족 8명",
  startDate: "2026-10-24", // 1일차 (D-day 기준)
  endDate: "2026-10-26",
  destination: "일본 오키나와 (나하 IN/OUT)",
  party: "8명 — 70대 2분, 40대 4명, 초등학생 2명",
  agency: {
    name: "㈜더 이루투어",
    manager: "김갑중 이사",
    phone: "070-7767-0119",
    mobile: "010-2565-3846",
  },
  hotel: "휴잇트 리조트 나하 또는 동급",
  hotelPhone: "098-943-8325",
  meet: {
    // 여행사 최종 일정표 확정값. 다시 미정이 되면 null 로 두면 '미정' 배지가 뜬다.
    time: "06:45" as string | null,
    // 진에어는 제1터미널이 아니라 제2터미널이다. 잘못 가면 셔틀로 20분 걸린다.
    place: "인천공항 제2터미널 3층 · 진에어 수속 카운터 앞",
    pendingNote: "집결 시각은 여행사 확정 연락 예정",
  },
} as const;

/**
 * 항공 스케줄. 일정 타임라인과 정보 카드가 같은 값을 보게 해서
 * 한쪽만 고쳐져 어긋나는 일을 막는다.
 * 비행시간은 일정표의 '항공 이동 동선' 표(2시간 20분) 기준 — 출·도착 시각 계산과도 일치한다.
 * (일정표 본문에는 2시간 30분 / 2시간 50분 이라고도 적혀 있는데 시각과 맞지 않는다.)
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
 * time 이 있으면 = 여행사가 확정해 준 시각(집결·항공). 시계로 표시한다.
 * timePending 이면 = 시각이 정해져야 하는데 아직 안 나온 항목. '미정'으로 표시한다.
 * 둘 다 없으면 = 시각 개념이 없는 방문지. 순서 번호로만 표시한다.
 *   ※ 일정표에 없는 시각을 앱이 지어내지 않는다.
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
  // ── 제1일 (10/24 토) 출발 & 남부 관광 ──
  {
    id: "d1-meet",
    day: 1,
    time: "06:45",
    title: "인천공항 제2터미널 3층 집결",
    memo:
      "진에어 수속 카운터 앞에서 여행사 담당자(김갑중 이사) 미팅 → 수속·수하물 탁송. " +
      "제1터미널이 아니라 제2터미널입니다. 공항에서 일정표·항공권·수하물 이름표·일본 입국 서류를 받습니다.",
  },
  {
    id: "d1-fly",
    day: 1,
    time: FLIGHTS.out.dep,
    title: `${FLIGHTS.out.from} 출발 → ${FLIGHTS.out.to} 도착 ${FLIGHTS.out.arr}`,
    place: "나하공항",
    memo: `${FLIGHTS.out.no} · ${FLIGHTS.durationText}. 도착 후 입국 심사 · 수하물 수취 · 세관 심사를 거쳐 전용 차량으로 나하 시내로 이동합니다.`,
  },
  // 원래 3일차에 잡혀 있던 중식을 1일차로 옮겼다(2026-08-04 여행사 조정).
  { id: "d1-lunch", day: 1, title: "중식 · 현지식", memo: "나하 시내 도착 후 첫 식사" },
  {
    id: "d1-umikaji",
    day: 1,
    title: "우미카지 테라스",
    place: "우미카지테라스",
    memo: "세나가섬의 '오키나와 산토리니'. 바다를 향해 늘어선 하얀 계단식 카페·상점가.",
  },
  {
    id: "d1-shuri",
    day: 1,
    title: "슈리성",
    place: "슈리성",
    memo: "류큐 왕국 450년의 상징 · 유네스코 세계유산. 정전(본전) 관람은 불포함입니다.",
  },
  {
    id: "d1-kokusai",
    day: 1,
    title: "국제거리 & 평화시장",
    place: "국제거리",
    memo: "오키나와 최대 번화가 '기적의 1마일'",
  },
  {
    id: "d1-dinner",
    day: 1,
    title: "🎂 석식 · 철판 스테이크 (샘즈 앙카인 국제거리점)",
    place: "국제거리",
    memo: "특식 1회차 · 칠순 축하 디너 — 케이크·축하상은 미리 요청해 두세요.",
    highlight: true,
  },
  {
    id: "d1-hotel",
    day: 1,
    title: "호텔 이동 · 체크인",
    place: "휴잇트리조트나하",
    memo: "휴잇트 리조트 나하 또는 동급. 2연박이라 숙소 이동이 없습니다.",
  },

  // ── 제2일 (10/25 일) 북부 하이라이트 ──
  { id: "d2-morning", day: 2, title: "호텔 조식 후 가이드 미팅", memo: "호텔 로비에서 출발" },
  {
    id: "d2-churaumi",
    day: 2,
    title: "츄라우미 수족관",
    place: "츄라우미수족관",
    memo: "일본 최대 규모 수족관. 길이 8.4m 고래상어가 헤엄치는 대수조 — 실내라 어르신·아이 모두에게 이번 여행의 하이라이트.",
  },
  { id: "d2-lunch", day: 2, title: "중식 · 츄라하나 (도반야키)", memo: "일본식 가정식" },
  {
    id: "d2-pineapple",
    day: 2,
    title: "나고 파인애플 파크",
    place: "나고파인애플파크",
    memo: "무인 자율주행 카트 '파인애플호'로 120여 종 파인애플 숲 탐험 — 아이들에게 인기",
  },
  {
    id: "d2-american",
    day: 2,
    title: "아메리칸 빌리지",
    place: "아메리칸빌리지",
    memo: "샌디에이고를 모티브로 한 복합 테마타운 · 바로 옆 선셋비치에서 노을",
  },
  {
    id: "d2-dinner",
    day: 2,
    title: "🎂 석식 · 야키니쿠 타베호다이 (유메마루)",
    memo: "특식 2회차 · 고기 뷔페",
    highlight: true,
  },
  {
    id: "d2-hotel",
    day: 2,
    title: "호텔 이동 · 투숙",
    place: "휴잇트리조트나하",
    memo: "같은 호텔 연박",
  },

  // ── 제3일 (10/26 월) 남부 절경 & 출국 ──
  // 13:35 출발이라 오전 관광 후 바로 공항으로 간다.
  // 중식은 1일차로 옮겨져 이 날은 조식 이후 식사가 없다(2026-08-04 여행사 확인).
  {
    id: "d3-checkout",
    day: 3,
    title: "호텔 조식 후 체크아웃",
    memo: "짐 정리 후 호텔 로비에서 가이드 미팅",
  },
  {
    id: "d3-naminoue",
    day: 3,
    title: "나미노우에 신사",
    place: "나미노우에신사",
    memo: "높은 절벽 위에 세워진 신사. 앞쪽 전망대에서 나하 시내와 바다가 한눈에 들어옵니다.",
  },
  {
    id: "d3-nirai",
    day: 3,
    title: "니라이카나이 대교",
    place: "니라이카나이대교",
    memo: "고지대에서 해안으로 내려가는 660m S자 곡선 · 오키나와 최고의 절경 드라이브 코스",
  },
  {
    id: "d3-chinen",
    day: 3,
    title: "치넨미사키 공원",
    place: "치넨미사키공원",
    memo: "태평양을 270도 파노라마로 감상하는 남부의 숨은 전망 명소",
  },
  {
    id: "d3-airport",
    day: 3,
    title: "나하 국제공항 이동 · 탑승 수속",
    place: "나하공항",
    memo: "수하물 탁송 → 출국 심사 → 게이트 이동. 이 날 중식은 불포함이고 기내식도 없으니 공항에서 요기해 두세요.",
  },
  {
    id: "d3-fly",
    day: 3,
    time: FLIGHTS.back.dep,
    title: `${FLIGHTS.back.from} 출발 → ${FLIGHTS.back.to} 도착 ${FLIGHTS.back.arr}`,
    place: "나하공항",
    memo: `${FLIGHTS.back.no} · 인천 도착 후 검역 · 입국심사 · 수하물 수취 · 세관 검사를 거쳐 행사 종료`,
  },
];

// ── 결제 · 입금 체크 ──
export type PaymentItem = {
  key: string;
  household: string;
  kind: "예약금" | "잔금";
  /** 만원 단위 */
  amount: number;
  note: string;
  /** 여행사 결제 기준: 예약금(계약금)·항공요금은 현금, 잔액은 카드 */
  method: "현금" | "카드";
};

// ※ 예전 자유여행 예약 체크가 되살아나지 않도록 새 키를 쓴다.
export const PAYMENTS: PaymentItem[] = [
  {
    key: "pay-chae-deposit",
    household: "채이네",
    kind: "예약금",
    amount: 250,
    note: "성인 3(부부 + 할머니) · 초등 1 → 65만 × 3 + 55만",
    method: "현금",
  },
  {
    key: "pay-chae-balance",
    household: "채이네",
    kind: "잔금",
    amount: 260,
    note: "집 합계 510만 − 예약금 250만",
    method: "카드",
  },
  {
    key: "pay-jiho-deposit",
    household: "지호네",
    kind: "예약금",
    amount: 250,
    note: "성인 3(부부 + 할아버지) · 초등 1 → 65만 × 3 + 55만",
    method: "현금",
  },
  {
    key: "pay-jiho-balance",
    household: "지호네",
    kind: "잔금",
    amount: 260,
    note: "집 합계 510만 − 예약금 250만",
    method: "카드",
  },
];

// ── 패키지 단가 · 집별 분담 (만원 단위) ──
// 2026-08-04 단가 조정: 성인 132→130, 소아 121→120.
// 예약금(성인 65 / 소아 55)은 그대로라 집별 예약금 250 은 유지되고 잔금만 줄었다.
//   총액 130×6 + 120×2 = 1,020 = 510 × 2 = 예약금 500 + 잔금 520 ✓
export const PACKAGE = {
  adultPrice: 130,
  childPrice: 120,
  adults: 6,
  children: 2,
  depositAdult: 65,
  depositChild: 55,
  households: [
    {
      name: "채이네",
      members: "부부(성인2) + 아이(초등1) + 할머니(성인1)",
      total: 510,
      deposit: 250,
      balance: 260,
    },
    {
      name: "지호네",
      members: "부부(성인2) + 아이(초등1) + 할아버지(성인1)",
      total: 510,
      deposit: 250,
      balance: 260,
    },
  ],
  paymentNote:
    "항공요금과 계약금(예약금)은 현금 결제, 잔액은 카드 결제 기준입니다. 현금 결제분은 현금영수증이 발행됩니다.",
  included: [
    "왕복 항공 (진에어) · 택스(공항세) · 유류할증료",
    "여행자보험 (최대 1억원) — 증권 발급 예정",
    "전 일정 식사 (1일차 조식 · 3일차 중식·석식 제외)",
    "일정 표기 입장료 — 슈리성 정전 관람은 불포함",
    "전담 로컬 가이드 · 전용 버스",
    "석식 2회 특식 (철판 스테이크 · 야키니쿠 타베호다이)",
  ],
  excluded: ["개인 경비", "매너 팁 (가이드 · 기사, 인당 약 5만원 예상)"],
};

// ── 준비물 체크리스트 ──
// key 에 p7- 접두어: 예전 자유여행 체크 상태와 섞이지 않게 한다.
export const PACKING: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "서류 (가장 중요)",
    items: [
      { key: "p7-passport", label: "여권 8명 — 2027. 4. 26. 이후까지 유효한지 확인" },
      {
        key: "p7-voucher",
        label: "여행사 서류 수령 (일정표·항공권·수하물 이름표·일본 입국 서류) — 당일 공항",
      },
      { key: "p7-seat", label: "가족 인접 좌석 요청 — 사전 체크인 전에 여행사에 전달" },
      { key: "p7-insurance", label: "여행자보험 증권 수령 — 어르신 두 분 보장액 확인" },
    ],
  },
  {
    group: "준비",
    items: [
      { key: "p7-esim", label: "eSIM 개통 / 포켓와이파이" },
      { key: "p7-cash", label: "엔화 환전 + 매너 팁용 현금" },
      { key: "p7-meds", label: "어르신 상비약 · 복용약" },
      { key: "p7-breakfast", label: "1일차 아침 · 기내 간식 (조식 불포함, 기내식 미제공)" },
      { key: "p7-charger", label: "멀티탭 · 충전기 (일본 A타입)" },
      { key: "p7-umbrella", label: "우산 · 우비 (10월 말 대비)" },
      { key: "p7-gold", label: "고가 금 · 귀금속은 한국 보관 (일본 세관 주의)" },
    ],
  },
  {
    group: "칠순 특별",
    items: [
      { key: "p7-cake", label: "🎂 1일차 스테이크 석식에 케이크 · 축하 요청" },
      { key: "p7-snack", label: "아이 간식 · 기내 장난감" },
      { key: "p7-photo", label: "가족사진 촬영 계획 (슈리성 · 치넨미사키)" },
    ],
  },
];

// ── 정보 카드 ──
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
    body: `10/24(토) ${TRIP.meet.time} · ${TRIP.meet.place}. 제1터미널이 아닙니다 — 잘못 가면 셔틀로 20분 걸립니다.`,
  },
  {
    icon: "🏨",
    title: "호텔",
    body: `${TRIP.hotel} (${TRIP.hotelPhone}) · 2연박이라 숙소 이동이 없습니다.`,
  },
  { icon: "🚌", title: "가이드 · 교통", body: "현지(로컬) 가이드 배정 예정 + 전용 버스. 자가운전이 없어 운전 부담이 없습니다." },
  {
    icon: "🍽️",
    title: "식사",
    body:
      "1일차 조식, 3일차 중식·석식은 불포함입니다(진에어는 기내식 미제공). " +
      "3일차는 호텔 조식 이후 귀가할 때까지 식사가 없으니 공항에서 요기하세요. 그 외 전 일정 식사 포함, 석식 2회는 특식입니다.",
  },
  {
    icon: "✅",
    title: "포함",
    body: "항공·택스·유류할증, 여행자보험 1억, 전 일정 식사, 일정 표기 입장료, 전담 가이드·전용버스, 특식 2회.",
  },
  { icon: "💸", title: "불포함", body: "개인 경비 + 매너 팁. 가이드·기사 팁은 인당 약 5만원 현금으로 준비하세요." },
  {
    icon: "🎫",
    title: "사전 체크인",
    body: "출발 1일 전(24시간 전) 여행사가 사전 체크인을 진행합니다. 탑승 게이트는 출발 당일 공항에서 확인 후 안내됩니다.",
  },
  {
    icon: "📞",
    title: "담당자",
    body: `${TRIP.agency.name} ${TRIP.agency.manager} · ${TRIP.agency.phone} / ${TRIP.agency.mobile}`,
  },
  {
    icon: "🚨",
    title: "세관 주의",
    body: "금·금제품(시계·반지·목걸이 등 액세서리 포함)을 휴대 반입하면 별송품 신고서에 반드시 신고해야 합니다. 면세범위 20만엔 초과분은 소비세 과세, 미신고 시 허위신고로 처벌·압수될 수 있습니다.",
  },
];
