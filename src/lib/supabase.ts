import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 환경변수가 있으면 Supabase 클라이언트를 만들고, 없으면 null.
// null 이면 store 가 자동으로 localStorage 모드로 동작한다.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const TRIP_ID = (import.meta.env.VITE_TRIP_ID as string | undefined) || "choi70";

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon, { realtime: { params: { eventsPerSecond: 5 } } }) : null;

export const isCloud = !!supabase;
