-- ─────────────────────────────────────────────────────────────
-- 최정숙 할머니의 칠순여행 · Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 [Run] 한 번이면 끝.
-- (단일 JSON 문서 방식 — 가족 8명 규모에 충분하고 운영이 단순합니다.)
-- ─────────────────────────────────────────────────────────────

-- 1) 여행 상태를 담는 테이블 (한 가족 = 한 행)
create table if not exists public.trip_state (
  id text primary key,                       -- 가족 공용 방 코드 (VITE_TRIP_ID, 기본 'choi70')
  data jsonb not null default '{}'::jsonb,    -- 일정/예약/준비물/메모 전체 상태
  updated_at timestamptz not null default now()
);

-- 2) 행 단위 보안(RLS) 켜기
alter table public.trip_state enable row level security;

-- 3) "링크를 아는 가족" 수준의 공용 화면 정책 (익명 키로 읽기/쓰기 허용)
--    ※ 민감정보(카드번호·여권번호 등)는 저장하지 마세요.
drop policy if exists "family read"   on public.trip_state;
drop policy if exists "family insert" on public.trip_state;
drop policy if exists "family update" on public.trip_state;

create policy "family read"   on public.trip_state for select using (true);
create policy "family insert" on public.trip_state for insert with check (true);
create policy "family update" on public.trip_state for update using (true) with check (true);

-- 4) 실시간 반영(Realtime)을 위해 publication 에 테이블 추가
--    이미 추가돼 있으면 에러가 날 수 있는데 무시해도 됩니다.
alter publication supabase_realtime add table public.trip_state;
