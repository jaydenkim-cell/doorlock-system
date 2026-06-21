import { useMemo, useState } from "react";
import { INFO_CARDS, PLACES, TRIP } from "../data/trip";
import { mutate, useTrip } from "../lib/store";
import { showToast } from "../lib/toast";
import {
  buildReference,
  buildSchedule,
  DayNo,
  dayLabel,
  dayTheme,
  computeAutoSchedule,
  fmtDuration,
  fmtTime,
  isFixed,
  minToTime,
  ScheduledEvent,
  timeToMin,
  TOLERANCE_MIN,
  validateMove,
} from "../lib/schedule";

const NUDGE = 30; // 분 단위 이동 폭

function mapUrl(place?: keyof typeof PLACES) {
  if (!place || !PLACES[place]) return null;
  const { lat, lng } = PLACES[place];
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export default function ScheduleTab({ me }: { me: string }) {
  const state = useTrip();
  const [day, setDay] = useState<DayNo>(1);
  const [editing, setEditing] = useState<string | null>(null);

  const schedule = useMemo(() => buildSchedule(state.events), [state.events]);
  const refMap = useMemo(() => buildReference(state.departureTime), [state.departureTime]);

  const arrival = minToTime(timeToMin(state.departureTime) + TRIP.flightMinutes);

  function changeDeparture(time: string) {
    if (!time) return;
    mutate(me, (d) => {
      d.departureTime = time;
      d.events = computeAutoSchedule(time);
    });
    showToast(`출발 ${time} 기준으로 일정을 다시 짰어요 (도착 ${minToTime(timeToMin(time) + TRIP.flightMinutes)})`);
  }

  function regenerate() {
    mutate(me, (d) => {
      d.events = computeAutoSchedule(d.departureTime);
    });
    showToast("기본 일정으로 다시 자동 배치했어요");
  }

  function applyMove(ev: ScheduledEvent, targetDay: DayNo, targetStartMin: number) {
    const check = validateMove(ev.id, refMap, targetDay, targetStartMin);
    if (!check.ok) {
      showToast(check.reason || "옮길 수 없어요", true);
      return;
    }
    mutate(me, (d) => {
      const e = d.events.find((x) => x.id === ev.id);
      if (e) {
        e.day = targetDay;
        e.startMin = targetStartMin;
      }
    });
    if (targetDay !== ev.day) {
      setDay(targetDay);
      showToast(`'${ev.title}' 일정을 ${dayLabel(targetDay)}로 옮겼어요`);
    }
  }

  function setDuration(ev: ScheduledEvent, min: number) {
    if (min < 15) return;
    mutate(me, (d) => {
      const e = d.events.find((x) => x.id === ev.id);
      if (e) e.durationMin = min;
    });
  }

  const events = schedule[day];

  return (
    <>
      {/* 기능 1: 출발시간 설정 → 자동 일정 */}
      <div className="card departure-box">
        <label>✈️ 인천 출발 시간을 정하면 일정이 자동으로 짜여요</label>
        <div className="row" style={{ marginTop: 8 }}>
          <input
            type="time"
            value={state.departureTime}
            onChange={(e) => changeDeparture(e.target.value)}
          />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            → 나하 도착 <b style={{ color: "var(--sea)" }}>{arrival}</b> (직항 2시간 30분)
          </span>
          <button className="btn ghost sm" onClick={regenerate}>자동 배치</button>
        </div>
        <div className="hint">
          도착 시각부터 첫날 일정이 차례로 채워지고, 둘째·셋째 날은 체크아웃 시각 기준으로 배치돼요.
          각 일정은 아래에서 직접 시간·날짜를 바꿀 수 있어요.
        </div>
      </div>

      {/* 날짜 탭 */}
      <div className="day-tabs">
        {([1, 2, 3] as DayNo[]).map((d) => (
          <button key={d} className={day === d ? "active" : ""} onClick={() => setDay(d)}>
            Day {d}
            <small>{dayLabel(d)} · {dayTheme(d)}</small>
          </button>
        ))}
      </div>

      {/* 타임라인 */}
      <div className="timeline">
        {events.map((ev) => {
          const open = editing === ev.id;
          const link = mapUrl(ev.place);
          const fixed = isFixed(ev.id);
          return (
            <div key={ev.id} className={"ev" + (ev.highlight ? " hl" : "") + (fixed ? " fixed" : "")}>
              <div className="time">
                {fmtTime(ev.startMin)}
                <small>~{fmtTime(ev.endMin)}</small>
              </div>
              <div className="body">
                <h4>{ev.title}</h4>
                <div className="meta">
                  {ev.place && <span>📍 {ev.place}</span>}
                  <span>⏱ {fmtDuration(ev.durationMin)}</span>
                </div>
                {ev.memo && <div className="memo">💡 {ev.memo}</div>}
                <div className="actions">
                  {link && (
                    <a className="chip-link" href={link} target="_blank" rel="noreferrer">🗺️ 지도</a>
                  )}
                  {!fixed && (
                    <button className="chip-link" onClick={() => setEditing(open ? null : ev.id)}>
                      {open ? "닫기" : "✏️ 수정"}
                    </button>
                  )}
                </div>

                {open && !fixed && (
                  <div className="editor">
                    <div className="grid">
                      <div>
                        <label>시간 옮기기</label>
                        <span className="nudge">
                          <button onClick={() => applyMove(ev, ev.day, ev.startMin - NUDGE)}>−30분</button>
                          <button onClick={() => applyMove(ev, ev.day, ev.startMin + NUDGE)}>+30분</button>
                        </span>
                      </div>
                      <div>
                        <label>머무는 시간</label>
                        <span className="nudge">
                          <button onClick={() => setDuration(ev, ev.durationMin - 15)}>−15</button>
                          <button onClick={() => setDuration(ev, ev.durationMin + 15)}>+15</button>
                        </span>
                      </div>
                    </div>
                    <div className="row">
                      <button
                        className="btn ghost sm"
                        disabled={day === 1}
                        onClick={() => applyMove(ev, (ev.day - 1) as DayNo, ev.startMin)}
                      >
                        ← 전날로
                      </button>
                      <button
                        className="btn ghost sm"
                        disabled={day === 3}
                        onClick={() => applyMove(ev, (ev.day + 1) as DayNo, ev.startMin)}
                      >
                        다음날로 →
                      </button>
                    </div>
                    <div className="move-warn">
                      ※ 원래 시간대와 ±{Math.round(TOLERANCE_MIN / 60)}시간 안에서만 옮길 수 있어요
                      (비슷한 시간대만 허용).
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 정보 카드 */}
      <h3 className="section-title">여행 정보</h3>
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
