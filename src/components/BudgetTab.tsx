import { BUDGET } from "../data/trip";

export default function BudgetTab() {
  const totalMin = BUDGET.rows.reduce((s, r) => s + r.min, 0);
  const totalMax = BUDGET.rows.reduce((s, r) => s + r.max, 0);
  const maxRow = Math.max(...BUDGET.rows.map((r) => r.max));
  const perMin = Math.round(totalMin / BUDGET.party);
  const perMax = Math.round(totalMax / BUDGET.party);
  const compareMax = Math.max(...BUDGET.compare.map((c) => c.max));

  return (
    <>
      <div className="bud-total">
        <div style={{ fontSize: 13, opacity: 0.85 }}>예상 총경비 (8인)</div>
        <div className="big">약 {totalMin}만 ~ {totalMax}만원</div>
        <div className="per">1인당 약 {perMin}만 ~ {perMax}만원</div>
      </div>

      <h3 className="section-title">항목별</h3>
      <div className="card">
        {BUDGET.rows.map((r) => (
          <div className="bar-row" key={r.label}>
            <div className="lab">
              <span>{r.label}</span>
              <b>{r.min}~{r.max}만</b>
            </div>
            <div className="bar">
              <span style={{ width: `${(r.max / maxRow) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <h3 className="section-title">여행 방식 비교</h3>
      <div className="card compare">
        {BUDGET.compare.map((c) => (
          <div className={"crow" + (c.self ? " self" : "")} key={c.label}>
            <span>
              {c.label}
              {c.self && <span className="tag">추천</span>}
            </span>
            <b>{c.min}~{c.max}만</b>
          </div>
        ))}
        <div className="bar" style={{ marginTop: 10 }}>
          <span style={{ width: `${(BUDGET.compare[0].max / compareMax) * 100}%`, background: "var(--coral)" }} />
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
          운전자 2명이라 자유여행 가능. 운전이 부담되면 8인 단독 패키지 견적도 비교해 보세요.
        </div>
      </div>
    </>
  );
}
