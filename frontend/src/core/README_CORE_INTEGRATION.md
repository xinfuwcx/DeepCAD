# Core Integration Quick Start

## Files Added
- timelineStore.ts : Global playback/time axis (looping) with speed & range control.
- sceneRegistry.ts : Register/remove scenes and attach Layer objects (lifecycle managed).
- rendererScheduler.ts : Single RAF loop updating active layers then rendering.
- useThreeScene.tsx : React hook to mount a scene + renderer + optional layers.
- layers/ExampleParticleLayer.ts : Demo Layer implementation.

## Bootstrapping
In app root (e.g. App.tsx or a ControlCenterShell) call:
```ts
import { startTimelineLoop } from './core/timelineStore';
import { startRendererScheduler } from './core/rendererScheduler';
startTimelineLoop();
startRendererScheduler();
```
Then mount a scene:
```tsx
import { ExampleParticleLayer } from './core/layers/ExampleParticleLayer';
import { useThreeScene } from './core/useThreeScene';

export function DemoScene() {
  const { mountRef } = useThreeScene({ id: 'demo', layers: [new ExampleParticleLayer()] });
  return <div ref={mountRef} style={{ width: '100%', height: 400 }} />;
}
```

## Migration Steps
1. Replace per-component requestAnimationFrame with Layer.update logic.
2. Move geometry/material creation to layer.init.
3. Use timelineStore for time-based animations rather than internal counters.
4. Dispose logic removed from React unmount; rely on sceneRegistry.remove.

## Layer Interface Recap
```ts
interface BaseLayer {
  id: string;
  visible: boolean;
  init(ctx: { scene:THREE.Scene; camera:THREE.Camera; renderer:THREE.WebGLRenderer }): void;
  update(dt:number, timelineTime:number): void;
  setVisible(v:boolean): void;
  dispose(): void;
}
```

## Next Candidates to Convert
- ParticleTest -> ParticleLayer
- WeatherVisualization -> WeatherLayer (dynamic textures/cloud sprites)
- DynamicContourGenerator -> ContourLayer (recompute lines in update or on data change)
- AnimationPlayer -> AnimationLayer (driven purely by timeline)

## Notes
- Multiple scenes supported; keep count minimal to reduce GPU context switches.
- For postprocessing later: add a PostProcessLayer that renders to an offscreen target and composits.
- Consider a capability probe (gl.getParameter) before enabling heavy layers.

## TODO (Future)
- Command Palette integration to toggle layers.
- Performance overlay layer.
- Persist layer visibility & timeline state.
