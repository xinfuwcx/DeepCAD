import * as THREE from 'three';
import { globalSceneRegistry } from '../sceneRegistry';

export interface PickingResult { object: THREE.Object3D; sceneId: string; layerId?: string; }
export type PickingFilter = (obj: THREE.Object3D) => boolean;

class PickingManagerImpl {
  private raycaster = new THREE.Raycaster();
  private filter: PickingFilter = () => true;

  setFilter(filter: PickingFilter) { this.filter = filter; }

  pick(clientX: number, clientY: number, dom: HTMLElement): PickingResult | null {
    const rect = dom.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    let closest: PickingResult | null = null;
    globalSceneRegistry.forEach(ctx => {
      this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), ctx.camera as THREE.PerspectiveCamera);
      const intersects: THREE.Intersection[] = [];
      ctx.scene.traverse(obj => {
        if (!this.filter(obj)) return;
        // Collect potential meshes with geometry
        const mesh = obj as any;
        if (mesh.isMesh || mesh.isPoints || mesh.isLine) {
          const localHits = this.raycaster.intersectObject(mesh, false);
          if (localHits.length) {
            intersects.push(...localHits);
          }
        }
      });
      intersects.sort((a,b)=> a.distance - b.distance);
      const first = intersects[0];
      if (first) {
        closest = { object: first.object, sceneId: ctx.id, layerId: (first.object as any).userData?.layerId };
      }
    });
    return closest;
  }
}

export const PickingManager = new PickingManagerImpl();
