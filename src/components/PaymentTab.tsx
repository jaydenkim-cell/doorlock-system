import { PACKAGE, PAYMENTS, TRIP } from "../data/trip";
import { mutate, paymentDoneCount, useTrip } from "../lib/store";
import { showToast } from "../lib/toast";

function ago(at: number): string {
  return new Date(at).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const won = (man: number) => man.toLocaleString("ko-KR");

export default function PaymentTab({ me }: { me: string }) {
  const state = useTrip();

  const total = PACKAGE.households.reduce((s, h) => s + h.total, 0);
  const deposit = PACKAGE.households.reduce((s, h) => s + h.deposit, 0);
  const balance = PACKAGE.households.reduce((s, h) => s + h.balance, 0);
  const done = paymentDoneCount(state);

  function toggle(key: string, label: string) {
    if (!me) {
      showToast("먼저 호칭을 설정해 주세요", true);
      return;
    }
    const cur = state.payments[key]?.done;
    mutate(me, (d) => {
      d.payments[key] = { done: !cur, by: me, at: Date.now() };
    });
    showToast(!cur ? `'${label}' 입금 완료로 표시했어요` : `'${label}' 체크를 해제했어요`);
  }

  return (
    <>
      <div className="bud-total">
        <div style={{ fontSize: 13, opacity: 0.85 }}>패키지 총액 (8인)</div>
        <div className="big">{won(total)}만원</div>
        <div className="per">
          예약금 {won(deposit)}만 · 잔금 {won(balance)}만
        </div>
      </div>

      <h3 className="section-title">입금 진행 {done}/{PAYMENTS.length}</h3>
      <p className="lead">
        채이네·지호네가 어르신 한 분씩 나눠 부담합니다. 입금을 마치면 왼쪽 체크를 눌러 가족에게
        알려주세요.
      </p>

      {PAYMENTS.map((p) => {
        const st = state.payments[p.key];
        const label = `${p.household} ${p.kind}`;
        return (
          <div className="card" key={p.key}>
            <div className="booking">
              <button
                className={"check" + (st?.done ? " on" : "")}
                onClick={() => toggle(p.key, label)}
                aria-label="입금 완료 체크"
              >
                {st?.done ? "✓" : ""}
              </button>
              <div className="info-col">
                <h4>
                  {p.household} · {p.kind}
                </h4>
                <div className="est">{won(p.amount)}만원</div>
                <div className="pay-note">{p.note}</div>
                {st?.done && (
                  <div className="by">
                    ✅ 입금 완료 · {st.by} · {ago(st.at)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="card contact">
        <h4>문의</h4>
        <p>
          {TRIP.agency.name} {TRIP.agency.manager}
        </p>
        <a className="btn full" href={`tel:${TRIP.agency.phone}`}>
          📞 {TRIP.agency.phone}
        </a>
      </div>
    </>
  );
}
