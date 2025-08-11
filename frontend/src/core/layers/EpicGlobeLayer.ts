import * as THREE from 'three';
import { BaseLayer, LayerInitContext } from '../sceneRegistry';

export interface EpicProject {
  id: string; name: string; lat: number; lng: number; depth: number; status: string; progress: number; description: string;
}

/**
 * EpicGlobeLayer
 * 将 PureThreeJSEpicCenter 的地球 + 项目标记 + 粒子系统迁移为可复用 Layer
 */
export interface EpicGlobeLayerOptions {
  onProjectClick?: (project: EpicProject) => void;
  flyDurationMs?: number;
}

export class EpicGlobeLayer implements BaseLayer {
  id = 'epicGlobe';
  visible = true;
  private globe?: THREE.Mesh;
  private particlePoints?: THREE.Points;
  private markerGroup?: THREE.Group;
  private resources: THREE.Object3D[] = [];
  private projects: EpicProject[];
  private camera?: THREE.Camera;
  private raycaster = new THREE.Raycaster();
  private tmpVec2 = new THREE.Vector2();
  private options: EpicGlobeLayerOptions;
  // flyTo animation state
  private flying = false;
  private flyStart?: THREE.Vector3;
  private flyEnd?: THREE.Vector3;
  private flyProgress = 0;
  private flyDuration = 2000; // ms

  constructor(projects: EpicProject[], options: EpicGlobeLayerOptions = {}) {
    this.projects = projects;
    this.options = options;
    if (options.flyDurationMs) this.flyDuration = options.flyDurationMs;
  }

  init(ctx: LayerInitContext): void {
    const scene = ctx.scene;
    this.camera = ctx.camera;
    // Globe
    const geometry = new THREE.SphereGeometry(800, 64, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x1a4d73, transparent: true, opacity: 0.8 });
    const globe = new THREE.Mesh(geometry, material);
    globe.name = 'epicGlobeTerrain';
    scene.add(globe);
    this.globe = globe;
    this.resources.push(globe);

    // Wireframe overlay
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x00ffff, opacity: 0.3, transparent: true })
    );
    globe.add(wireframe);

    // Markers
    const markerGroup = new THREE.Group();
    markerGroup.name = 'epicMarkers';
    this.projects.forEach(p => {
      const phi = (90 - p.lat) * (Math.PI / 180);
      const theta = (p.lng + 180) * (Math.PI / 180);
      const radius = 820;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const markerGeom = new THREE.ConeGeometry(10, 40, 8);
      let color = 0xffff00;
      if (p.status === 'completed') color = 0x00ff00; else if (p.status === 'planning') color = 0xff4444;
      const markerMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
      const marker = new THREE.Mesh(markerGeom, markerMat);
      marker.position.set(x, y, z);
      marker.lookAt(0, 0, 0); marker.rotateX(Math.PI);
      marker.castShadow = true;
      marker.userData = p;
      marker.name = `marker-${p.id}`;
      markerGroup.add(marker);
      // Glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(15, 16, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 })
      );
      glow.position.copy(marker.position);
      markerGroup.add(glow);
    });
    scene.add(markerGroup);
    this.markerGroup = markerGroup;
    this.resources.push(markerGroup);

    // Particles
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4000;
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 2, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(particleGeom, particleMat);
    particles.name = 'epicParticles';
    scene.add(particles);
    this.particlePoints = particles;
    this.resources.push(particles);

    // Lights (basic); assume global lighting handled elsewhere if needed
    if (!scene.getObjectByName('epicAmbient')) {
      const ambient = new THREE.AmbientLight(0x404040, 0.4); ambient.name = 'epicAmbient'; scene.add(ambient);
    }
    if (!scene.getObjectByName('epicDir')) {
      const dir = new THREE.DirectionalLight(0xffffff, 1); dir.position.set(1000, 1000, 500); dir.name = 'epicDir'; scene.add(dir);
    }
  }

  update(dt: number, _timelineTime: number): void {
    if (this.globe) this.globe.rotation.y += dt * 0.1; // slow spin
    if (this.particlePoints) this.particlePoints.rotation.y += dt * 0.2;
    // subtle breathing on markers group
    if (this.markerGroup) this.markerGroup.rotation.y += dt * 0.05;
    if (this.flying && this.camera && this.flyStart && this.flyEnd) {
      this.flyProgress += (dt * 1000) / this.flyDuration;
      if (this.flyProgress >= 1) {
        this.flyProgress = 1; this.flying = false;
      }
      const pos = new THREE.Vector3().lerpVectors(this.flyStart, this.flyEnd, this.easeInOutQuad(this.flyProgress));
      (this.camera as THREE.PerspectiveCamera).position.copy(pos);
      this.camera.lookAt(0,0,0);
    }
  }

  private easeInOutQuad(t: number) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

  /** 归一化坐标 (NDC) 下执行拾取，返回项目 */
  pick(normalizedX: number, normalizedY: number): EpicProject | undefined {
    if (!this.camera || !this.markerGroup) return undefined;
    this.tmpVec2.set(normalizedX, normalizedY);
    this.raycaster.setFromCamera(this.tmpVec2, this.camera as THREE.PerspectiveCamera);
    const intersects = this.raycaster.intersectObjects(this.markerGroup.children, false);
    if (intersects.length) {
      const obj = intersects[0].object;
      if (obj.userData && (obj.userData as EpicProject).id) {
        return obj.userData as EpicProject;
      }
    }
    return undefined;
  }

  /** 对外暴露点击拾取 (屏幕坐标) */
  handleClick(clientX: number, clientY: number, dom: HTMLElement) {
    const rect = dom.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    const proj = this.pick(nx, ny);
    if (proj && this.options.onProjectClick) this.options.onProjectClick(proj);
    if (proj) this.flyToProject(proj.id);
  }

  /** 平滑飞向项目 */
  flyToProject(projectId: string) {
    if (!this.camera) return;
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return;
    const phi = (90 - proj.lat) * (Math.PI / 180);
    const theta = (proj.lng + 180) * (Math.PI / 180);
    const radius = 1200;
    const target = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
    this.flyStart = (this.camera as THREE.PerspectiveCamera).position.clone();
    this.flyEnd = target;
    this.flyProgress = 0;
    this.flying = true;
  }

  setVisible(v: boolean): void {
    this.visible = v;
    [this.globe, this.particlePoints, this.markerGroup].forEach(o => { if (o) o.visible = v; });
  }

  dispose(): void {
    this.resources.forEach(obj => {
      obj.parent?.remove(obj);
      obj.traverse((child: any) => {
        if (child.geometry) { try { child.geometry.dispose(); } catch {} }
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m: any) => { try { m.dispose && m.dispose(); } catch {} });
        }
      });
    });
    this.resources = [];
  }
}
