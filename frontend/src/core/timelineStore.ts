import { create } from 'zustand';

interface TimelineMarker { id: string; time: number; label?: string; }
interface LoopSegment { start: number; end: number; enabled: boolean; }

interface TimelineState {
  currentTime: number; // seconds
  playing: boolean;
  speed: number; // multiplier
  range: { start: number; end: number };
  lastTick: number; // timestamp for dt calc
  markers: TimelineMarker[];
  loopSegment: LoopSegment | null;
  setTime: (t: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (s: number) => void;
  setRange: (start: number, end: number) => void;
  addMarker: (time: number, label?: string) => string; // returns id
  removeMarker: (id: string) => void;
  setLoopSegment: (seg: LoopSegment | null) => void;
  tick: () => void; // advance by realtime * speed
  seekPercent: (p: number) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  currentTime: 0,
  playing: false,
  speed: 1,
  range: { start: 0, end: 60 },
  lastTick: performance.now(),
  markers: [],
  loopSegment: null,
  setTime: (t) => set({ currentTime: Math.max(get().range.start, Math.min(t, get().range.end)) }),
  play: () => set({ playing: true, lastTick: performance.now() }),
  pause: () => set({ playing: false }),
  setSpeed: (s) => set({ speed: s }),
  setRange: (start, end) => set({ range: { start, end }, currentTime: Math.min(get().currentTime, end) }),
  addMarker: (time, label) => {
    const id = 'm_' + Math.random().toString(36).slice(2,9);
    set({ markers: [...get().markers, { id, time, label }] });
    return id;
  },
  removeMarker: (id) => set({ markers: get().markers.filter(m => m.id !== id) }),
  setLoopSegment: (seg) => set({ loopSegment: seg }),
  seekPercent: (p) => {
    const { range } = get();
    const t = range.start + (range.end - range.start) * p;
    set({ currentTime: t });
  },
  tick: () => {
  const { playing, speed, lastTick, range, currentTime, loopSegment } = get();
    const now = performance.now();
  // 当未播放时，不产生任何状态更新，避免在应用挂载阶段持续触发全局订阅渲染
  if (!playing) { return; }
    const dtSec = (now - lastTick) / 1000 * speed;
    let next = currentTime + dtSec;
    const loop = loopSegment && loopSegment.enabled ? loopSegment : null;
    const segmentStart = loop ? loop.start : range.start;
    const segmentEnd = loop ? loop.end : range.end;
    if (next > segmentEnd) {
      next = segmentStart; // loop segment
    }
  set({ currentTime: next, lastTick: now });
  }
}));

// RAF driver (singleton) - can be imported once in app root
let _timelineLoopStarted = false;
export function startTimelineLoop() {
  if (_timelineLoopStarted) return;
  _timelineLoopStarted = true;
  const loop = () => {
    useTimelineStore.getState().tick();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
