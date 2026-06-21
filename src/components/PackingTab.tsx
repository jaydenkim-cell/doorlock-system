import { PACKING } from "../data/trip";
import { mutate, useTrip } from "../lib/store";
import { showToast } from "../lib/toast";

export default function PackingTab({ me }: { me: string }) {
  const state = useTrip();

  const all = PACKING.flatMap((g) => g.items);
  const done = all.filter((i) => state.packing[i.key]?.done).length;

  function toggle(key: string) {
    if (!me) {
      showToast("먼저 호칭을 설정해 주세요", true);
      return;
    }
    const cur = state.packing[key]?.done;
    mutate(me, (d) => {
      d.packing[key] = { done: !cur, by: me, at: Date.now() };
    });
  }

  return (
    <>
      <h3 className="section-title">준비물 ({done}/{all.length})</h3>
      {PACKING.map((g) => (
        <div className="card pack-group" key={g.group}>
          <h4>{g.group}</h4>
          {g.items.map((it) => {
            const st = state.packing[it.key];
            return (
              <div className={"pack-item" + (st?.done ? " done" : "")} key={it.key}>
                <button
                  className={"check" + (st?.done ? " on" : "")}
                  onClick={() => toggle(it.key)}
                  aria-label="준비 완료"
                >
                  {st?.done ? "✓" : ""}
                </button>
                <span className="lbl">{it.label}</span>
                {st?.done && <span className="by">{st.by}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
