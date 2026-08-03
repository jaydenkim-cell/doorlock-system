import { PACKAGE } from "../data/trip";

const won = (man: number) => man.toLocaleString("ko-KR");

export default function BudgetTab() {
  const { adultPrice, childPrice, adults, children, depositAdult, depositChild } = PACKAGE;
  const total = adultPrice * adults + childPrice * children;
  const maxHousehold = Math.max(...PACKAGE.households.map((h) => h.total));

  return (
    <>
      <div className="bud-total">
        <div style={{ fontSize: 13, opacity: 0.85 }}>더 이루투어 올인클루시브 패키지 · 총액 (8인)</div>
        <div className="big">{won(total)}만원</div>
        <div className="per">
          성인 <b>{adultPrice}만</b> × {adults}명 · 초등 <b>{childPrice}만</b> × {children}명
        </div>
      </div>

      <h3 className="section-title">집별 분담</h3>
      <div className="card">
        {PACKAGE.households.map((h) => (
          <div className="bar-row" key={h.name}>
            <div className="lab">
              <span>{h.name}</span>
              <b>{won(h.total)}만</b>
            </div>
            <div className="bar">
              <span style={{ width: `${(h.total / maxHousehold) * 100}%` }} />
            </div>
            <div className="sub-note">
              {h.members} · 예약금 {won(h.deposit)}만 / 잔금 {won(h.balance)}만
            </div>
          </div>
        ))}
        <div className="sub-note" style={{ marginTop: 4 }}>
          예약금 기준 성인 {depositAdult}만 · 초등 {depositChild}만. 두 집 모두 성인 3 · 초등 1이라
          금액이 같습니다 (어르신을 어느 집이 맡든 동일).
        </div>
      </div>

      <h3 className="section-title">포함 / 불포함</h3>
      <div className="card incl">
        <h4 className="ok">포함</h4>
        <ul>
          {PACKAGE.included.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <h4 className="no">불포함</h4>
        <ul>
          {PACKAGE.excluded.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="note">
          팁은 현금으로 미리 준비하세요. 입금 전 취소·환불 위약금 규정을 확인하시길 권합니다.
        </p>
      </div>
    </>
  );
}
