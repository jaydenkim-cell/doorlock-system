/**
 * 소리 · 진동 피드백
 *
 * 초2에게 "재미"의 상당 부분이 여기서 나온다. 그런데 항상 마지막 할 일로
 * 밀리다가 결국 안 들어간다. 그래서 MVP 필수 항목으로 먼저 만든다.
 * 오디오 파일을 쓰지 않고 WebAudio 로 합성한다 — 받을 것도, 캐시할 것도 없다.
 */

import { settings } from './state.js';

let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // 모바일 브라우저는 첫 터치 전까지 오디오를 잠가둔다
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** 앱 첫 터치에서 오디오 잠금을 푼다 */
export function unlock() { audio(); }

function tone(freq, startAt, dur, type = 'sine', gain = 0.18) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + startAt);
  g.gain.setValueAtTime(0, ac.currentTime + startAt);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + startAt + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + startAt);
  osc.stop(ac.currentTime + startAt + dur + 0.02);
}

function on() { try { return settings().sound; } catch { return true; } }
function buzzOn() { try { return settings().haptics; } catch { return true; } }

function vibrate(pattern) {
  if (!buzzOn() || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch {}
}

export function tap() {
  if (on()) tone(660, 0, 0.05, 'triangle', 0.09);
  vibrate(8);
}

export function correct() {
  if (on()) { tone(784, 0, 0.10, 'sine'); tone(1047, 0.09, 0.16, 'sine'); }
  vibrate(20);
}

/** 오답은 벌이 아니다. 낮고 짧게, 놀라지 않을 정도로만. */
export function wrong() {
  if (on()) { tone(300, 0, 0.14, 'sine', 0.14); tone(240, 0.12, 0.18, 'sine', 0.12); }
  vibrate([14, 60, 14]);
}

/** 개인 최고 기록 갱신 */
export function zap() {
  if (on()) { tone(1047, 0, 0.06, 'square', 0.10); tone(1319, 0.05, 0.06, 'square', 0.10); tone(1568, 0.10, 0.12, 'square', 0.10); }
  vibrate([10, 30, 10, 30, 20]);
}

export function fanfare() {
  if (on()) {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle', 0.16));
    tone(1319, 0.44, 0.45, 'sine', 0.14);
  }
  vibrate([30, 50, 30, 50, 80]);
}
