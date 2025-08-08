/**
 * 地质建模Three.js渲染器
 * 专门处理GemPy→PyVista→Three.js的地质数据可视化
 */

import * as THREE from 'three';

export interface GeologicalFormationData {
  type: 'geological_mesh';
  formation: string;
  metadata: {
    vertex_count: number;
    face_count: number;
    has_normals: boolean;
    has_colors: boolean;
    has_scalars: boolean;
  };
  geometry: {
    vertices: number[];      // [x1,y1,z1, x2,y2,z2, ...]
    normals: number[];       // [nx1,ny1,nz1, nx2,ny2,nz2, ...]
    indices: number[];       // [i1,i2,i3, i4,i5,i6, ...]
    colors: number[];        // [r1,g1,b1, r2,g2,b2, ...]
    scalars: number[];       // [s1, s2, s3, ...]
  };
  material: {
    color: number[];
    opacity: number;
    transparent: boolean;
    side: string;
  };
  wireframe?: {
    vertices: number[];
    indices: number[];
  };
}

export interface GeologicalModelData {
  type: 'geological_model';
  version: string;
  timestamp: number;
  metadata: any;
  formations: { [key: string]: GeologicalFormationData };
  statistics: {
    formation_count: number;
    total_vertices: number;
    total_faces: number;
    conversion_time: number;
  };
  lod_levels?: {
    enabled: boolean;
    levels: Array<{ distance: number; detail: string }>;
  };
}

export interface RenderingOptions {
  showWireframe: boolean;
  enableLOD: boolean;
  transparentMode: boolean;
  colorBy: 'formation' | 'scalar' | 'depth';
  lightingIntensity: number;
}

export class GeologicalThreeJSRenderer {
  private scene: THREE.Scene;
  private geologicalGroup: THREE.Group;
  private formationMeshes: Map<string, THREE.Mesh> = new Map();
  private wireframeMeshes: Map<string, THREE.LineSegments> = new Map();
  private options: RenderingOptions;

  constructor(scene: THREE.Scene, options: Partial<RenderingOptions> = {}) {
    this.scene = scene;
    this.geologicalGroup = new THREE.Group();
    this.geologicalGroup.name = 'GeologicalModel';
    this.scene.add(this.geologicalGroup);

    // 默认渲染选项
    this.options = {
      showWireframe: false,
      enableLOD: true,
      transparentMode: true,
      colorBy: 'formation',
      lightingIntensity: 1.0,
      ...options
    };
  }

  /**
   * 渲染地质模型数据
   */
  public renderGeologicalModel(modelData: GeologicalModelData): void {
    try {
      console.log('🔄 开始渲染地质模型...', modelData.statistics);

      // 清除现有网格
      this.clearGeologicalModel();

      // 渲染每个地质体
      Object.entries(modelData.formations).forEach(([formationName, formationData]) => {
        this.renderFormation(formationName, formationData);
      });

      console.log(`✅ 地质模型渲染完成: ${modelData.statistics.formation_count}个地质体`);

    } catch (error) {
      console.error('❌ 地质模型渲染失败:', error);
    }
  }

  /**
   * 渲染单个地质体
   */
  private renderFormation(formationName: string, formationData: GeologicalFormationData): void {
    try {
      // 1. 创建几何体
      const geometry = new THREE.BufferGeometry();

      // 顶点数据
      const vertices = new Float32Array(formationData.geometry.vertices);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      // 法向量
      if (formationData.geometry.normals.length > 0) {
        const normals = new Float32Array(formationData.geometry.normals);
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      } else {
        geometry.computeVertexNormals();
      }

      // 索引
      if (formationData.geometry.indices.length > 0) {
        geometry.setIndex(formationData.geometry.indices);
      }

      // 颜色
      if (formationData.geometry.colors.length > 0) {
        const colors = new Float32Array(formationData.geometry.colors);
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }

      // 标量数据（用于颜色映射）
      if (formationData.geometry.scalars.length > 0) {
        const scalars = new Float32Array(formationData.geometry.scalars);
        geometry.setAttribute('scalar', new THREE.BufferAttribute(scalars, 1));
      }

      // 2. 创建材质
      const material = this.createFormationMaterial(formationData);

      // 3. 创建网格
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `formation_${formationName}`;
      mesh.userData = {
        formationType: formationName,
        metadata: formationData.metadata
      };

      // 4. 添加到场景
      this.geologicalGroup.add(mesh);
      this.formationMeshes.set(formationName, mesh);

      // 5. 创建线框（如果需要）
      if (this.options.showWireframe && formationData.wireframe) {
        this.createWireframe(formationName, formationData.wireframe);
      }

      console.log(`✓ 地质体渲染完成: ${formationName} (${formationData.metadata.vertex_count}顶点)`);

    } catch (error) {
      console.error(`❌ 地质体渲染失败 (${formationName}):`, error);
    }
  }

  /**
   * 创建地质体材质
   */
  private createFormationMaterial(formationData: GeologicalFormationData): THREE.Material {
    const materialProps = formationData.material;

    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(materialProps.color[0], materialProps.color[1], materialProps.color[2]),
      opacity: this.options.transparentMode ? materialProps.opacity : 1.0,
      transparent: this.options.transparentMode && materialProps.transparent,
      side: materialProps.side === 'DoubleSide' ? THREE.DoubleSide : THREE.FrontSide,
      vertexColors: formationData.geometry.colors.length > 0,
      wireframe: false
    });

    // 根据渲染选项调整材质
    if (this.options.colorBy === 'scalar' && formationData.geometry.scalars.length > 0) {
      // 使用标量数据进行颜色映射
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <color_vertex>',
          `
          #include <color_vertex>
          float scalarValue = scalar;
          vColor.rgb = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), scalarValue);
          `
        );
      };
    }

    return material;
  }

  /**
   * 创建线框
   */
  private createWireframe(formationName: string, wireframeData: { vertices: number[]; indices: number[] }): void {
    try {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(wireframeData.vertices);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      if (wireframeData.indices.length > 0) {
        geometry.setIndex(wireframeData.indices);
      }

      const material = new THREE.LineBasicMaterial({
        color: 0x000000,
        opacity: 0.3,
        transparent: true
      });

      const wireframe = new THREE.LineSegments(geometry, material);
      wireframe.name = `wireframe_${formationName}`;
      
      this.geologicalGroup.add(wireframe);
      this.wireframeMeshes.set(formationName, wireframe);

    } catch (error) {
      console.error(`线框创建失败 (${formationName}):`, error);
    }
  }

  /**
   * 更新渲染选项
   */
  public updateRenderingOptions(newOptions: Partial<RenderingOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // 应用新的渲染选项
    this.formationMeshes.forEach((mesh, formationName) => {
      // 更新材质
      if (mesh.material instanceof THREE.MeshLambertMaterial) {
        mesh.material.opacity = this.options.transparentMode ? 0.8 : 1.0;
        mesh.material.transparent = this.options.transparentMode;
        mesh.material.needsUpdate = true;
      }

      // 显示/隐藏线框
      const wireframe = this.wireframeMeshes.get(formationName);
      if (wireframe) {
        wireframe.visible = this.options.showWireframe;
      }
    });
  }

  /**
   * 为所有地质体材质应用裁剪平面
   */
  public applyClippingPlanes(planes: THREE.Plane[] | null): void {
    this.formationMeshes.forEach((mesh) => {
      if (mesh.material instanceof THREE.Material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat: any) => {
          mat.clippingPlanes = planes || null;
          mat.needsUpdate = true;
        });
      }
    });
  }

  /**
   * 显示/隐藏特定地质体
   */
  public setFormationVisibility(formationName: string, visible: boolean): void {
    const mesh = this.formationMeshes.get(formationName);
    if (mesh) {
      mesh.visible = visible;
    }

    const wireframe = this.wireframeMeshes.get(formationName);
    if (wireframe) {
      wireframe.visible = visible && this.options.showWireframe;
    }
  }

  /**
   * 获取地质体信息
   */
  public getFormationInfo(formationName: string): any {
    const mesh = this.formationMeshes.get(formationName);
    return mesh ? mesh.userData : null;
  }

  /**
   * 清除地质模型
   */
  public clearGeologicalModel(): void {
    // 清除网格
    this.formationMeshes.forEach((mesh) => {
      this.geologicalGroup.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) mesh.material.dispose();
    });
    this.formationMeshes.clear();

    // 清除线框
    this.wireframeMeshes.forEach((wireframe) => {
      this.geologicalGroup.remove(wireframe);
      if (wireframe.geometry) wireframe.geometry.dispose();
      if (wireframe.material instanceof THREE.Material) wireframe.material.dispose();
    });
    this.wireframeMeshes.clear();
  }

  /**
   * 获取包围盒
   */
  public getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(this.geologicalGroup);
    return box;
  }

  /**
   * 自动调整相机视角
   */
  public fitCameraToModel(camera: THREE.PerspectiveCamera): void {
    const box = this.getBoundingBox();
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    camera.position.copy(center);
    camera.position.z += distance;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }

  /**
   * 销毁渲染器
   */
  public dispose(): void {
    this.clearGeologicalModel();
    this.scene.remove(this.geologicalGroup);
  }

  /**
   * 简易爆炸视图：按组中心向外偏移
   */
  public applyExplode(offset: number): void {
    const box = new THREE.Box3().setFromObject(this.geologicalGroup);
    const center = box.getCenter(new THREE.Vector3());
    this.formationMeshes.forEach((mesh) => {
      const meshCenter = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      const dir = meshCenter.clone().sub(center).normalize();
      if (!isFinite(dir.length())) return;
      mesh.position.copy(dir.multiplyScalar(offset));
    });
  }
}