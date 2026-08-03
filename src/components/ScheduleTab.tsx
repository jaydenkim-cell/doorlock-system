import { useMemo, useState } from "react";
import { DAY_META, DayNo, INFO_CARDS, PLACES, PLAN, PlanEvent, TRIP } from "../data/trip";

function mapUrl(place?: keyof typeof PLACES) {
  if (!place || !PLACES[place]) return null;
  const { lat, lng } = PLACES[place];
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * 하루치 일정을 화면 순서대로 돌려준다.
 * 시각이 없는 방문지에는 그 날 안에서의 순번(1,2,3…)을 매긴다.
 * — 여행사 일정표에 없는 시각을 지어내지 않기 위한 표기 방식.
 * 확정 시각이 있거나(time) 확정 대기 중인(timePending) 항목은 순번을 쓰지 않는다.
 */
function eventsOfDay(day: DayNo): { ev: PlanEvent; ord?: number }[] {
  let n = 0;
  return PLAN.filter((e) => e.day === day).map((ev) =>
    ev.time || ev.timePending ? { ev } : { ev, ord: ++n },
  );
}

export default function ScheduleTab() {
  const [day, setDay] = useState<DayNo>(1);
  const rows = useMemo(() => eventsOfDay(day), [day]);

  return (
    <>
      {/* 패키지 개요 — 자유여행 시절의 '출발시간 설정' 박스를 대체 */}
      <div className="card package-box">
        <label>🧳 더 이루투어 올인클루시브 패키지 · 2박 3일</label>
        <div className="hint">
          항공 · 호텔 · 전 일정 식사 · 전용버스 · 가이드가 모두 포함된 확정 일정입니다.
          방문 순서는 여행사 일정표 기준이며, 현지 사정에 따라 순서가 바뀔 수 있어요.
        </div>
        <div className="meet-warn">
          📣 집결 · {TRIP.meet.place}
          <br />
          {TRIP.meet.time ? (
            <b>
              10/24 {TRIP.meet.time}
            </b>
          ) : (
            <b className="tbd-inline">{TRIP.meet.pendingNote}</b>
          )}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <a className="btn ghost sm" href={`tel:${TRIP.agency.phone}`}>
            📞 {TRIP.agency.name} {TRIP.agency.manager}
          </a>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{TRIP.agency.phone}</span>
        </div>
      </div>

      {/* 날짜 탭 */}
      <div className="day-tabs">
        {([1, 2, 3] as DayNo[]).map((d) => (
          <button key={d} className={day === d ? "active" : ""} onClick={() => setDay(d)}>
            Day {d}
            <small>
              {DAY_META[d].label} · {DAY_META[d].theme}
            </small>
          </button>
        ))}
      </div>

      {/* 타임라인 */}
      <div className="timeline">
        {rows.map(({ ev, ord }) => {
          const link = mapUrl(ev.place);
          return (
            <div
              key={ev.id}
              className={
                "ev" +
                (ev.highlight ? " hl" : "") +
                (ev.time || ev.timePending ? " fixed" : "") +
                (ev.timePending ? " pending" : "")
              }
            >
              <div className="time">
                {ev.time ? (
                  <>
                    {ev.time}
                    <small>확정</small>
                  </>
                ) : ev.timePending ? (
                  <span className="tbd">미정</span>
                ) : (
                  <span className="ord">{ord}</span>
                )}
              </div>
              <div className="body">
                <h4>{ev.title}</h4>
                {ev.place && (
                  <div className="meta">
                    <span>📍 {ev.place}</span>
                  </div>
                )}
                {ev.memo && <div className="memo">💡 {ev.memo}</div>}
                {link && (
                  <div className="actions">
                    <a className="chip-link" href={link} target="_blank" rel="noreferrer">
                      🗺️ 지도
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 정보 카드 */}
      <h3 className="section-title">알아두면 좋은 정보</h3>
      <div className="info-grid">
        {INFO_CARDS.map((c) => (
          <div className="info" key={c.title}>
            <div className="ic">{c.icon}</div>
            <h5>{c.title}</h5>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
