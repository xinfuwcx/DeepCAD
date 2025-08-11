import * as THREE from 'three';
import { deepDispose, safeDetachRenderer } from '../utils/safeThreeDetach';

export interface SceneContext {
  id: string;
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  layers: BaseLayer[];
  active: boolean;
  mount?: HTMLElement | null;
  dispose: () => void;
}

export interface LayerInitContext {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
}

export interface BaseLayer {
  id: string;
  visible: boolean;
  init(ctx: LayerInitContext): void;
  update(dt: number, timelineTime: number): void;
  setVisible(v: boolean): void;
  dispose(): void;
}

export class SceneRegistry {
  private scenes: Map<string, SceneContext> = new Map();
  add(ctx: Omit<SceneContext, 'dispose' | 'layers' | 'active'> & { layers?: BaseLayer[] }): SceneContext {
    const context: SceneContext = {
      ...ctx,
      active: true,
      layers: [],
      dispose: () => this.remove(ctx.id)
    };
    if (ctx.layers) {
      ctx.layers.forEach(l => this.attachLayer(context, l));
    }
    this.scenes.set(ctx.id, context);
    return context;
  }
  attachLayer(sceneCtx: SceneContext, layer: BaseLayer) {
    try {
      layer.init({ scene: sceneCtx.scene, camera: sceneCtx.camera, renderer: sceneCtx.renderer });
      sceneCtx.layers.push(layer);
    } catch (e) {
      console.warn('[SceneRegistry] layer init error', layer.id, e);
    }
  }
  remove(id: string) {
    const ctx = this.scenes.get(id);
    if (!ctx) return;
    ctx.layers.forEach(l => { try { l.dispose(); } catch {} });
    deepDispose(ctx.scene);
    safeDetachRenderer(ctx.renderer as any);
    this.scenes.delete(id);
  }
  forEach(cb: (ctx: SceneContext) => void) {
    this.scenes.forEach(cb);
  }
  get(id: string) { return this.scenes.get(id); }
}

// Global singleton (simple)
export const globalSceneRegistry = new SceneRegistry();
