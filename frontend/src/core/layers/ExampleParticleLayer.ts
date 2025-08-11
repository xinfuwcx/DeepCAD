import * as THREE from 'three';
import { BaseLayer, LayerInitContext } from '../sceneRegistry';

export class ExampleParticleLayer implements BaseLayer {
  id = 'exampleParticles';
  visible = true;
  private points?: THREE.Points;
  private material?: THREE.PointsMaterial;
  private geometry?: THREE.BufferGeometry;

  init(ctx: LayerInitContext): void {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x00ffff, size: 4, transparent: true, opacity: 0.7 });
    const points = new THREE.Points(geometry, material);
    this.geometry = geometry;
    this.material = material;
    this.points = points;
    ctx.scene.add(points);
  }
  update(dt: number, timelineTime: number): void {
    if (this.points) {
      this.points.rotation.y += dt * 0.1;
      this.points.rotation.x = Math.sin(timelineTime * 0.2) * 0.3;
    }
  }
  setVisible(v: boolean): void {
    this.visible = v;
    if (this.points) this.points.visible = v;
  }
  dispose(): void {
    if (this.points) {
      this.points.parent?.remove(this.points);
    }
    this.geometry?.dispose();
    this.material?.dispose();
  }
}
