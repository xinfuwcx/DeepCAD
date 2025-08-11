import { globalSceneRegistry } from './sceneRegistry';
import { useTimelineStore } from './timelineStore';

let _started = false;
export function startRendererScheduler() {
  if (_started) return;
  _started = true;
  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = (now - last) / 1000; // seconds
    last = now;
    const timelineTime = useTimelineStore.getState().currentTime;
    globalSceneRegistry.forEach(ctx => {
      if (!ctx.active) return;
      ctx.layers.forEach(layer => {
        if (layer.visible) {
          try { layer.update(dt, timelineTime); } catch (e) { /* eslint-disable no-console */ console.warn('[Layer update error]', layer.id, e); }
        }
      });
      try {
        ctx.renderer.render(ctx.scene, ctx.camera);
      } catch (e) {
        console.warn('[Render error]', ctx.id, e);
      }
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
