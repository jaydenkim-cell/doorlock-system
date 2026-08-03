import { useEffect, useMemo, useState } from "react";
import { PAYMENTS, TRIP } from "./data/trip";
import {
  getMyName,
  paymentDoneCount,
  setMyName,
  SYNC_MODE,
  useReady,
  useTrip,
} from "./lib/store";
import { subscribeToasts, Toast } from "./lib/toast";
import ScheduleTab from "./components/ScheduleTab";
import PaymentTab from "./components/PaymentTab";
import BudgetTab from "./components/BudgetTab";
import PackingTab from "./components/PackingTab";
import MemoTab from "./components/MemoTab";

const VERSION = "v8 (여행사 최종 일정표)";

type TabId = "schedule" | "payment" | "budget" | "packing" | "memo";
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "schedule", label: "일정", icon: "📍" },
  { id: "payment", label: "결제", icon: "💳" },
  { id: "budget", label: "경비", icon: "💰" },
  { id: "packing", label: "준비물", icon: "🧳" },
  { id: "memo", label: "가족메모", icon: "💬" },
];

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** 입금 진행 링. 퍼센트가 아니라 "N/4" 건수로 보여준다(가족이 세기 쉽게). */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="ring">
      <svg width="64" height="64">
        <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.25)" strokeWidth="6" fill="none" />
        <circle
          cx="32"
          cy="32"
          r={r}
          stroke="var(--gold)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - c * pct}
        />
      </svg>
      <div className="pct">
        {done}/{total}
        <small>입금</small>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabId>("schedule");
  const state = useTrip();
  const ready = useReady();
  const [me, setMe] = useState(getMyName());
  const [askName, setAskName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = subscribeToasts(setToasts);
    return () => {
      unsub();
    };
  }, []);
  useEffect(() => {
    if (!me) setAskName(true);
  }, [me]);

  const dday = useMemo(() => daysUntil(TRIP.startDate), []);
  const paid = paymentDoneCount(state);

  function saveName() {
    const n = nameInput.trim();
    if (!n) return;
    setMyName(n);
    setMe(n);
    setAskName(false);
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="display">{TRIP.title}</h1>
        <div className="sub">
          {TRIP.subtitle} · {TRIP.startDate.split("-").join(".")}~{TRIP.endDate.slice(5).replace("-", ".")}
        </div>
        <div className="header-row">
          <div className="dday">
            <b>{dday > 0 ? `D-${dday}` : dday === 0 ? "D-DAY" : `D+${-dday}`}</b>
            <span>출발까지</span>
          </div>
          <ProgressRing done={paid} total={PAYMENTS.length} />
          <div className="who">
            <button onClick={() => { setNameInput(me); setAskName(true); }}>
              {me ? `👤 ${me}` : "이름 설정"}
            </button>
            <div className="sync-badge">
              <i className={"dot" + (SYNC_MODE === "local" ? " local" : "")} />
              {SYNC_MODE === "cloud" ? "실시간 공유 중" : "이 기기에 저장"}
            </div>
          </div>
        </div>
      </header>

      <main className="content">
        {!ready && <div className="empty">불러오는 중…</div>}
        {ready && tab === "schedule" && <ScheduleTab />}
        {ready && tab === "payment" && <PaymentTab me={me} />}
        {ready && tab === "budget" && <BudgetTab />}
        {ready && tab === "packing" && <PackingTab me={me} />}
        {ready && tab === "memo" && <MemoTab me={me} />}

        {state.updatedBy && (
          <div className="empty" style={{ paddingTop: 8, fontSize: 11 }}>
            마지막 업데이트 · {state.updatedBy} ·{" "}
            {new Date(state.updatedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        <div className="verline">
          {TRIP.title} · 계획표 <b>{VERSION}</b>
        </div>
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            <span className="ic">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {askName && (
        <div className="modal-bg" onClick={() => me && setAskName(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>호칭을 알려주세요</h3>
            <p>모든 체크·메모에 누가 했는지 표시돼요. (예: 사위, 큰형님, 막내)</p>
            <input
              autoFocus
              type="text"
              placeholder="이름 또는 호칭"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
            />
            <button className="btn full" onClick={saveName}>저장</button>
          </div>
        </div>
      )}

      {toasts.map((t) => (
        <div key={t.id} className={"toast" + (t.warn ? " warn" : "")}>{t.text}</div>
      ))}
    </div>
  );
}
