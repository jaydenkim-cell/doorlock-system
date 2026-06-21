// 아주 작은 토스트 버스 (컴포넌트 어디서든 호출)
type Toast = { id: number; text: string; warn?: boolean };
const subs = new Set<(t: Toast[]) => void>();
let toasts: Toast[] = [];
let seq = 1;

export function showToast(text: string, warn = false) {
  const t: Toast = { id: seq++, text, warn };
  toasts = [...toasts, t];
  subs.forEach((s) => s(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    subs.forEach((s) => s(toasts));
  }, 2600);
}

export function subscribeToasts(cb: (t: Toast[]) => void) {
  subs.add(cb);
  cb(toasts);
  return () => subs.delete(cb);
}
export type { Toast };
