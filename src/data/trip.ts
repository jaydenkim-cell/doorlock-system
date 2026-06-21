// ─────────────────────────────────────────────────────────────
// 최정숙 할머니의 칠순여행 — 확정 콘텐츠 상수 (핸드오프 문서 §3)
// 일정/예약/경비/준비물의 "정의"는 여기서 관리하고,
// 체크 상태·메모 등 "변하는 값"만 store(Supabase/localStorage)에 저장한다.
// ─────────────────────────────────────────────────────────────

export const TRIP = {
  title: "최정숙 할머니의 칠순여행",
  subtitle: "오키나와 2박 3일 · 가족 8명",
  startDate: "2026-10-24", // 1일차 (D-day 기준)
  endDate: "2026-10-26",
  destination: "일본 오키나와 (나하 IN/OUT)",
  party: "8명 — 70대 2분, 40대 4명, 초등학생 2명",
  // 인천 → 나하 직항 소요(분). 시차 없음.
  flightMinutes: 150,
  // 출발시간 미설정 시 기본 가정 출발(인천)·도착 시각 — 자동 일정 계산의 기준.
  defaultDepartureTime: "11:55",
} as const;

export type Coord = { lat: number; lng: number };

// 주요 장소 좌표 (지도 핀용) — §3.2
export const PLACES: Record<string, Coord> = {
  나하공항: { lat: 26.1958, lng: 127.6459 },
  온나손리조트: { lat: 26.4978, lng: 127.8485 },
  만자모: { lat: 26.5052, lng: 127.8505 },
  추라우미수족관: { lat: 26.6943, lng: 127.878 },
  나고파인애플파크: { lat: 26.6165, lng: 127.9696 },
  코우리섬: { lat: 26.7073, lng: 128.0182 },
  아메리칸빌리지: { lat: 26.3159, lng: 127.754 },
  국제거리: { lat: 26.2151, lng: 127.6847 },
};

// 일정 한 칸. durationMin = 이 일정에 머무는(또는 다음까지 걸리는) 시간.
// 자동 일정은 각 Day의 anchor 시각부터 durationMin 을 누적해 시작시각을 계산한다.
export type PlanEvent = {
  id: string;
  day: 1 | 2 | 3;
  title: string;
  place?: keyof typeof PLACES;
  memo?: string;
  durationMin: number;
  // true 이면 비행 등 고정 이벤트로 취급(자동계산의 기준점, 사용자 이동 제한).
  fixed?: boolean;
  // 🎂 칠순 하이라이트 강조
  highlight?: boolean;
};

// Day 1 은 "도착시각(=출발+비행시간)"을 anchor 로 삼아 자동 배치된다.
// Day 2/3 은 각 dayStart 를 anchor 로 삼는다.
export const DAY_STARTS: Record<2 | 3, string> = {
  2: "09:00", // 리조트 체크아웃
  3: "09:30", // 에어비앤비 체크아웃
};

// 기본 일정 (시작시각은 durationMin 누적으로 자동 산출되므로 여기엔 시간 없음)
export const BASE_PLAN: PlanEvent[] = [
  // ── Day 1 (10/24 금) 도착 & 휴식 ──
  // 첫 칸은 "나하 도착" = 출발+비행. fixed 로 두고 anchor 역할.
  { id: "d1-arrive", day: 1, title: "나하공항 도착 · 렌터카 2대 수령", place: "나하공항", durationMin: 90, fixed: true },
  { id: "d1-drive-onna", day: 1, title: "온나손으로 이동", place: "온나손리조트", memo: "좌측통행·우핸들 첫 운전, 천천히", durationMin: 75 },
  { id: "d1-checkin", day: 1, title: "온나손 리조트 체크인 · 휴식", place: "온나손리조트", durationMin: 90 },
  { id: "d1-manza", day: 1, title: "만자모(萬座毛) 절벽 석양", place: "만자모", memo: "입장 100엔", durationMin: 75 },
  { id: "d1-dinner", day: 1, title: "🎂 리조트 칠순 축하 디너", place: "온나손리조트", memo: "케이크·축하상 사전 요청", durationMin: 120, highlight: true },

  // ── Day 2 (10/25 토) 북부 하이라이트 ──
  { id: "d2-checkout", day: 2, title: "리조트 체크아웃", place: "온나손리조트", durationMin: 60 },
  { id: "d2-churaumi", day: 2, title: "추라우미 수족관 (고래상어·돌고래쇼)", place: "추라우미수족관", memo: "실내라 어르신·아이에게 최적", durationMin: 180 },
  { id: "d2-pineapple", day: 2, title: "나고 파인애플파크", place: "나고파인애플파크", durationMin: 75 },
  { id: "d2-kouri", day: 2, title: "코우리섬 드라이브", place: "코우리섬", durationMin: 90 },
  { id: "d2-airbnb", day: 2, title: "차탄 에어비앤비 체크인 · 장보기", place: "아메리칸빌리지", memo: "독채, 무료주차 2대", durationMin: 90 },
  { id: "d2-party", day: 2, title: "🎂 집에서 칠순 축하상 · 아메리칸빌리지 야경", place: "아메리칸빌리지", durationMin: 150, highlight: true },

  // ── Day 3 (10/26 일) 마무리 & 출국 ──
  { id: "d3-checkout", day: 3, title: "에어비앤비 체크아웃", place: "아메리칸빌리지", durationMin: 45 },
  { id: "d3-shopping", day: 3, title: "국제거리 / 아메리칸빌리지 쇼핑", place: "국제거리", durationMin: 150 },
  { id: "d3-return-car", day: 3, title: "렌터카 반납", place: "나하공항", durationMin: 45 },
  { id: "d3-depart", day: 3, title: "나하공항 출국 (오후~저녁편 권장)", place: "나하공항", durationMin: 120, fixed: true },
];

// ── 예약 항목 (§3.5) ──
export type BookingItem = {
  key: string;
  label: string;
  estimate?: string;
  links: { name: string; url: string }[];
};

export const BOOKINGS: BookingItem[] = [
  {
    key: "air",
    label: "항공권 (인천 ↔ 나하 직항)",
    estimate: "220만~290만",
    links: [
      { name: "스카이스캐너", url: "https://www.skyscanner.co.kr" },
      { name: "네이버항공", url: "https://flight.naver.com" },
      { name: "트립닷컴", url: "https://kr.trip.com" },
    ],
  },
  {
    key: "car",
    label: "렌터카 2대 (7인승+5인승)",
    estimate: "52만~64만",
    links: [
      { name: "타비라이", url: "https://kr.tabirai.net/car/okinawa" },
      { name: "트립닷컴", url: "https://kr.trip.com/carhire" },
      { name: "오박사투어", url: "https://www.okinawaobaksa.com" },
    ],
  },
  {
    key: "hotel",
    label: "온나손 리조트 (10/24, 1박)",
    estimate: "리조트+에어비앤비 합 105만~165만",
    links: [
      { name: "아고다", url: "https://www.agoda.com" },
      { name: "부킹닷컴", url: "https://www.booking.com" },
      { name: "트립닷컴", url: "https://kr.trip.com" },
    ],
  },
  {
    key: "airbnb",
    label: "차탄 에어비앤비 (10/25, 1박 독채)",
    links: [
      { name: "에어비앤비", url: "https://www.airbnb.co.kr" },
      { name: "부킹닷컴(전체주택)", url: "https://www.booking.com" },
    ],
  },
  {
    key: "ticket",
    label: "추라우미 수족관 입장권",
    estimate: "입장료·관광 25만~30만",
    links: [
      { name: "클룩", url: "https://www.klook.com" },
      { name: "KKday", url: "https://www.kkday.com/ko" },
      { name: "트립닷컴", url: "https://kr.trip.com" },
    ],
  },
  {
    key: "esim",
    label: "eSIM / 와이파이",
    links: [
      { name: "트립닷컴 eSIM", url: "https://kr.trip.com" },
      { name: "도시락와이파이", url: "https://www.dosirakwifi.com" },
    ],
  },
  {
    key: "insure",
    label: "여행자보험",
    estimate: "보험·eSIM·잡비 50만~70만",
    links: [
      { name: "트립닷컴", url: "https://kr.trip.com" },
      { name: "마이리얼트립", url: "https://www.myrealtrip.com" },
    ],
  },
  {
    key: "pkg",
    label: "(선택) 8인 단독 패키지 견적 비교",
    links: [
      { name: "하나투어", url: "https://www.hanatour.com" },
      { name: "모두투어", url: "https://www.modetour.com" },
      { name: "트립스토어", url: "https://www.tripstore.kr" },
    ],
  },
];

// ── 경비 (§3.6) 만원 단위 ──
export const BUDGET = {
  rows: [
    { label: "항공권", min: 220, max: 290 },
    { label: "숙소(리조트1박+에어비앤비1박)", min: 105, max: 165 },
    { label: "렌터카 2대(2박3일)", min: 52, max: 64 },
    { label: "입장료·관광", min: 25, max: 30 },
    { label: "식비(집밥 일부 절감)", min: 80, max: 100 },
    { label: "기타(보험·eSIM·잡비)", min: 50, max: 70 },
  ],
  party: 8,
  compare: [
    { label: "자유여행 (에어비앤비 1박)", min: 540, max: 720, self: true },
    { label: "에어텔", min: 600, max: 760 },
    { label: "풀패키지(가이드·버스)", min: 480, max: 700 },
  ],
};

// ── 준비물 체크리스트 (§3.7) ──
export const PACKING: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "서류 (가장 중요)",
    items: [
      { key: "passport", label: "여권 8명 (유효기간 6개월↑)" },
      { key: "license", label: "국제+한국 운전면허증 (운전자 2분)" },
      { key: "voucher", label: "항공·숙소 바우처" },
    ],
  },
  {
    group: "통신·금융",
    items: [
      { key: "esim", label: "eSIM·와이파이" },
      { key: "insure", label: "여행자보험 가입" },
      { key: "money", label: "엔화 환전 + 해외결제 카드" },
    ],
  },
  {
    group: "어르신·아이",
    items: [
      { key: "medicine", label: "어르신 상비약" },
      { key: "snack", label: "아이 간식" },
      { key: "photo", label: "가족사진 촬영 계획" },
    ],
  },
  {
    group: "생활·기타",
    items: [
      { key: "charger", label: "멀티탭·충전기 (일본 A타입)" },
      { key: "umbrella", label: "우산 (태풍 대비)" },
      { key: "cake", label: "🎂 칠순 케이크·현수막" },
    ],
  },
];

// ── 정보 카드 (§3 꿀팁) ──
export const INFO_CARDS = [
  { icon: "✈️", title: "공항", body: "나하 직항은 인천공항만 운항 (김포 불가). 직항 약 2시간 30분, 시차 없음." },
  { icon: "🚗", title: "운전", body: "자가운전 2명(본인+형님). 일본은 좌측통행·우핸들 — 첫날 천천히. 네비 목적지 미리 공유." },
  { icon: "🌤️", title: "날씨", body: "10월 말 27/22℃, 따뜻하나 태풍 변수 약간. 항공·숙소 환불규정 확인 + 보험 가입." },
  { icon: "💴", title: "환율", body: "100엔 ≈ 950원 (작성 시점). 엔화 환전 + 해외결제 카드 준비." },
  { icon: "🪪", title: "서류 3종", body: "렌터카 픽업 시 국제운전면허증 + 한국 면허증 + 여권 (운전자 2명 모두)." },
  { icon: "👶", title: "카시트", body: "일본은 만 6세 미만만 의무 → 이번 여행(초4·초2)은 불필요." },
];
