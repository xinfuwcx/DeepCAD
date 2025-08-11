/**
 * selectionDispatcher
 * 统一选中事件总线：来自 Deck.gl / EpicGlobe / 列表点击
 * 后续可扩展为事件订阅系统；目前最小实现。
 */
 type Listener = (payload: { source: string; projectId: string }) => void;
 const listeners = new Set<Listener>();

 export function onSelection(l: Listener) { listeners.add(l); return () => listeners.delete(l); }
 export function emitSelection(source: string, projectId: string) {
   listeners.forEach(l => { try { l({ source, projectId }); } catch {} });
 }
