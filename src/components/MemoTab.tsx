import { useState } from "react";
import { mutate, useTrip } from "../lib/store";
import { showToast } from "../lib/toast";

function when(at: number): string {
  return new Date(at).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MemoTab({ me }: { me: string }) {
  const state = useTrip();
  const [text, setText] = useState("");

  function post() {
    const t = text.trim();
    if (!t) return;
    if (!me) {
      showToast("먼저 호칭을 설정해 주세요", true);
      return;
    }
    mutate(me, (d) => {
      d.memos.unshift({ id: crypto.randomUUID(), name: me, text: t, at: Date.now() });
    });
    setText("");
    showToast("메모를 남겼어요");
  }

  function remove(id: string) {
    mutate(me, (d) => {
      d.memos = d.memos.filter((m) => m.id !== id);
    });
  }

  const memos = [...state.memos].sort((a, b) => b.at - a.at);

  return (
    <>
      <h3 className="section-title">가족 메모</h3>
      <div className="card memo-form">
        <textarea
          placeholder="가족에게 남길 의견을 적어주세요 (예: 추라우미 오전이 덜 붐벼요)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn full" style={{ marginTop: 8 }} onClick={post}>메모 올리기</button>
      </div>

      {memos.length === 0 && <div className="empty">아직 메모가 없어요. 첫 메모를 남겨보세요!</div>}
      {memos.map((m) => (
        <div className="card memo-item" key={m.id}>
          <div className="head">
            <b>{m.name}</b>
            <span className="at">{when(m.at)}</span>
          </div>
          <p>{m.text}</p>
          {m.name === me && (
            <button className="chip-link" style={{ marginTop: 8 }} onClick={() => remove(m.id)}>삭제</button>
          )}
        </div>
      ))}
    </>
  );
}
