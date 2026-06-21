import { BOOKINGS } from "../data/trip";
import { mutate, useTrip } from "../lib/store";
import { showToast } from "../lib/toast";

function ago(at: number): string {
  return new Date(at).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingTab({ me }: { me: string }) {
  const state = useTrip();

  function toggle(key: string, label: string) {
    if (!me) {
      showToast("먼저 호칭을 설정해 주세요", true);
      return;
    }
    const cur = state.bookings[key]?.done;
    mutate(me, (d) => {
      d.bookings[key] = { done: !cur, by: me, at: Date.now() };
    });
    showToast(!cur ? `'${label}' 예약 완료 체크` : `'${label}' 체크 해제`);
  }

  return (
    <>
      <h3 className="section-title">예약 진행</h3>
      {BOOKINGS.map((b) => {
        const st = state.bookings[b.key];
        return (
          <div className="card" key={b.key}>
            <div className="booking">
              <button
                className={"check" + (st?.done ? " on" : "")}
                onClick={() => toggle(b.key, b.label)}
                aria-label="예약 완료 체크"
              >
                {st?.done ? "✓" : ""}
              </button>
              <div className="info-col">
                <h4>{b.label}</h4>
                {b.estimate && <div className="est">예상 {b.estimate}원</div>}
                {st?.done && <div className="by">✅ {st.by} · {ago(st.at)}</div>}
                <div className="links">
                  {b.links.map((l) => (
                    <a className="chip-link" key={l.url} href={l.url} target="_blank" rel="noreferrer">
                      {l.name} ↗
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
