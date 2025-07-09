/**
 * 性能优化器 - 专门解决Three.js渲染性能问题
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import * as THREE from 'three';

export interface OptimizationSettings {
  enableLOD: boolean;
  maxDrawCalls: number;
  targetFPS: number;
  memoryThreshold: number;
  enableInstancedRendering: boolean;
  enableFrustumCulling: boolean;
  enableOcclusion: boolean;
  textureCompression: boolean;
}

export class PerformanceOptimizer {
  private settings: OptimizationSettings;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  private lodObjects: Map<string, THREE.LOD> = new Map();
  private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private frustumCullingObjects: THREE.Object3D[] = [];
  
  constructor(settings: Partial<OptimizationSettings> = {}) {
    this.settings = {
      enableLOD: true,
      maxDrawCalls: 100,
      targetFPS: 60,
      memoryThreshold: 70, // 70%
      enableInstancedRendering: true,
      enableFrustumCulling: true,
      enableOcclusion: false,
      textureCompression: true,
      ...settings
    };
  }

  /**
   * 初始化优化器
   */
  initialize(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    // 优化渲染器设置
    this.optimizeRenderer();
    
    console.log('🚀 性能优化器已初始化');
  }

  /**
   * 优化渲染器设置
   */
  private optimizeRenderer(): void {
    if (!this.renderer) return;
    
    // 启用自动清理
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 优化阴影设置
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // 静态场景不需要每帧更新阴影
    
    // 启用剔除
    this.renderer.setClearColor(0x87CEEB, 1);
    
    // 优化材质
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    console.log('🎨 渲染器优化完成');
  }

  /**
   * 优化地质模型
   */
  optimizeGeologicalModel(geologicalGroup: THREE.Group): THREE.Group {
    if (!geologicalGroup) return geologicalGroup;
    
    const optimizedGroup = new THREE.Group();
    optimizedGroup.name = 'OptimizedGeologicalModel';
    
    // 合并相同材质的几何体
    const materialGroups = new Map<string, THREE.Mesh[]>();
    
    geologicalGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materialKey = this.getMaterialKey(child.material);
        if (!materialGroups.has(materialKey)) {
          materialGroups.set(materialKey, []);
        }
        materialGroups.get(materialKey)!.push(child);
      }
    });
    
    // 为每个材质组创建合并的几何体
    for (const [materialKey, meshes] of materialGroups) {
      if (meshes.length > 1) {
        const mergedGeometry = this.mergeGeometries(meshes);
        const mergedMesh = new THREE.Mesh(mergedGeometry, meshes[0].material);
        mergedMesh.name = `MergedGeology_${materialKey}`;
        optimizedGroup.add(mergedMesh);
      } else {
        optimizedGroup.add(meshes[0].clone());
      }
    }
    
    // 创建LOD版本
    if (this.settings.enableLOD) {
      this.createLODVersion(optimizedGroup);
    }
    
    console.log(`🔧 地质模型优化完成: ${geologicalGroup.children.length} → ${optimizedGroup.children.length} 对象`);
    return optimizedGroup;
  }

  /**
   * 合并几何体
   */
  private mergeGeometries(meshes: THREE.Mesh[]): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    
    meshes.forEach(mesh => {
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      geometries.push(geometry);
    });
    
    // 使用BufferGeometryUtils合并
    const mergedGeometry = new THREE.BufferGeometry();
    
    // 简化版合并 - 只合并position属性
    const positions: number[] = [];
    const indices: number[] = [];
    let indexOffset = 0;
    
    geometries.forEach(geometry => {
      const positionAttribute = geometry.getAttribute('position');
      if (positionAttribute) {
        const positionArray = positionAttribute.array;
        positions.push(...Array.from(positionArray));
        
        const indexAttribute = geometry.getIndex();
        if (indexAttribute) {
          const indexArray = indexAttribute.array;
          for (let i = 0; i < indexArray.length; i++) {
            indices.push(indexArray[i] + indexOffset);
          }
          indexOffset += positionArray.length / 3;
        }
      }
    });
    
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (indices.length > 0) {
      mergedGeometry.setIndex(indices);
    }
    
    mergedGeometry.computeBoundingBox();
    mergedGeometry.computeBoundingSphere();
    
    return mergedGeometry;
  }

  /**
   * 创建LOD版本
   */
  private createLODVersion(group: THREE.Group): void {
    group.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        const lod = new THREE.LOD();
        
        // 高精度版本 (近距离)
        lod.addLevel(child, 0);
        
        // 中等精度版本 (中距离)
        const mediumGeometry = this.simplifyGeometry(child.geometry, 0.5);
        const mediumMesh = new THREE.Mesh(mediumGeometry, child.material);
        lod.addLevel(mediumMesh, 100);
        
        // 低精度版本 (远距离)
        const lowGeometry = this.simplifyGeometry(child.geometry, 0.2);
        const lowMesh = new THREE.Mesh(lowGeometry, child.material);
        lod.addLevel(lowMesh, 500);
        
        // 替换原始网格
        const parent = child.parent;
        if (parent) {
          parent.remove(child);
          parent.add(lod);
        }
      }
    });
  }

  /**
   * 简化几何体
   */
  private simplifyGeometry(geometry: THREE.BufferGeometry, factor: number): THREE.BufferGeometry {
    // 简化版几何体简化 - 通过减少顶点数量
    const simplified = geometry.clone();
    
    const positionAttribute = simplified.getAttribute('position');
    if (positionAttribute) {
      const originalCount = positionAttribute.count;
      const targetCount = Math.floor(originalCount * factor);
      
      if (targetCount < originalCount) {
        // 创建简化的位置数组
        const positions = positionAttribute.array;
        const simplifiedPositions = new Float32Array(targetCount * 3);
        
        const step = originalCount / targetCount;
        for (let i = 0; i < targetCount; i++) {
          const sourceIndex = Math.floor(i * step) * 3;
          simplifiedPositions[i * 3] = positions[sourceIndex];
          simplifiedPositions[i * 3 + 1] = positions[sourceIndex + 1];
          simplifiedPositions[i * 3 + 2] = positions[sourceIndex + 2];
        }
        
        simplified.setAttribute('position', new THREE.Float32BufferAttribute(simplifiedPositions, 3));
        simplified.computeBoundingBox();
        simplified.computeBoundingSphere();
      }
    }
    
    return simplified;
  }

  /**
   * 获取材质键
   */
  private getMaterialKey(material: THREE.Material | THREE.Material[]): string {
    if (Array.isArray(material)) {
      return material.map(m => m.uuid).join('_');
    }
    return material.uuid;
  }

  /**
   * 启用视锥体剔除
   */
  enableFrustumCulling(objects: THREE.Object3D[]): void {
    this.frustumCullingObjects = objects;
    console.log(`🔍 视锥体剔除已启用: ${objects.length} 个对象`);
  }

  /**
   * 执行视锥体剔除
   */
  performFrustumCulling(): void {
    if (!this.camera || !this.settings.enableFrustumCulling) return;
    
    const frustum = new THREE.Frustum();
    const cameraMatrix = new THREE.Matrix4();
    
    cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraMatrix);
    
    this.frustumCullingObjects.forEach(object => {
      object.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.visible = frustum.intersectsObject(child);
        }
      });
    });
  }

  /**
   * 清理内存
   */
  cleanupMemory(): void {
    if (!this.scene) return;
    
    let cleanedObjects = 0;
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // 清理几何体
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        // 清理材质
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(object.material);
          }
        }
        
        cleanedObjects++;
      }
    });
    
    // 清理渲染器
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    console.log(`🧹 内存清理完成: ${cleanedObjects} 个对象`);
  }

  /**
   * 清理材质
   */
  private disposeMaterial(material: THREE.Material): void {
    // 清理纹理
    Object.keys(material).forEach(key => {
      const value = (material as any)[key];
      if (value && typeof value === 'object' && 'dispose' in value) {
        value.dispose();
      }
    });
    
    material.dispose();
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(currentFPS: number, memoryUsage: number): string[] {
    const suggestions: string[] = [];
    
    if (currentFPS < this.settings.targetFPS) {
      suggestions.push('启用LOD优化以提高帧率');
      suggestions.push('减少场景中的绘制调用');
      suggestions.push('合并相同材质的几何体');
    }
    
    if (memoryUsage > this.settings.memoryThreshold) {
      suggestions.push('启用纹理压缩');
      suggestions.push('清理未使用的资源');
      suggestions.push('使用几何体实例化');
    }
    
    if (currentFPS < 30) {
      suggestions.push('考虑降低渲染质量');
      suggestions.push('禁用实时阴影');
      suggestions.push('减少后处理效果');
    }
    
    return suggestions;
  }

  /**
   * 应用自动优化
   */
  applyAutoOptimization(currentFPS: number, memoryUsage: number): void {
    if (currentFPS < 20) {
      // 紧急优化
      this.settings.enableLOD = true;
      this.settings.enableFrustumCulling = true;
      this.settings.enableOcclusion = true;
      
      if (this.renderer) {
        this.renderer.shadowMap.enabled = false;
        this.renderer.setPixelRatio(1);
      }
      
      console.log('🚨 应用紧急性能优化');
    } else if (currentFPS < 30) {
      // 标准优化
      this.settings.enableLOD = true;
      this.settings.enableFrustumCulling = true;
      
      console.log('⚡ 应用标准性能优化');
    }
    
    if (memoryUsage > 80) {
      this.cleanupMemory();
      console.log('🧹 执行内存清理');
    }
  }
}

// 全局性能优化器实例
export const globalPerformanceOptimizer = new PerformanceOptimizer({
  enableLOD: true,
  maxDrawCalls: 50,
  targetFPS: 60,
  memoryThreshold: 70,
  enableInstancedRendering: true,
  enableFrustumCulling: true,
  enableOcclusion: false,
  textureCompression: true
}); 